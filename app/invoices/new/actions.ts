'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface InvoiceData {
  id?: string; // NEW: Added ID for updates
  invoice_number: string;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  type: 'indian' | 'overseas';
  currency: string;
  line_items: { description: string; sac_hsn: string; qty: number; rate: number; amount: number }[];
  subtotal: number;
  gst_type: 'cgst_sgst' | 'igst' | 'none';
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  total_amount: number;
  notes?: string;
  payment_instructions?: string;
}

export async function saveInvoice(invoiceData: InvoiceData) {
  const supabase = createClient()

  if (invoiceData.id) {
    // ==== EDIT EXISTING INVOICE ====
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        customer_id: invoiceData.customer_id,
        invoice_date: invoiceData.invoice_date,
        due_date: invoiceData.due_date,
        type: invoiceData.type,
        currency: invoiceData.currency,
        line_items: invoiceData.line_items,
        subtotal: invoiceData.subtotal,
        gst_type: invoiceData.gst_type,
        cgst_rate: invoiceData.cgst_rate,
        sgst_rate: invoiceData.sgst_rate,
        igst_rate: invoiceData.igst_rate,
        cgst_amount: invoiceData.cgst_amount,
        sgst_amount: invoiceData.sgst_amount,
        igst_amount: invoiceData.igst_amount,
        total_amount: invoiceData.total_amount,
        notes: invoiceData.notes,
        payment_instructions: invoiceData.payment_instructions,
      })
      .eq('id', invoiceData.id)

    if (updateError) return { success: false, error: updateError.message }

    // Update the linked Income Entry so the Billed Amount matches any edits
    await supabase.from('income_entries').update({
      customer_id: invoiceData.customer_id,
      invoice_date: invoiceData.invoice_date,
      currency: invoiceData.currency,
      invoice_amount: invoiceData.total_amount,
    }).eq('invoice_id', invoiceData.id)

    revalidatePath('/invoices')
    return { success: true, invoiceId: invoiceData.id }
    
  } else {
    // ==== CREATE NEW INVOICE ====
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([{
        invoice_number: invoiceData.invoice_number,
        customer_id: invoiceData.customer_id,
        invoice_date: invoiceData.invoice_date,
        due_date: invoiceData.due_date,
        type: invoiceData.type,
        currency: invoiceData.currency,
        line_items: invoiceData.line_items,
        subtotal: invoiceData.subtotal,
        gst_type: invoiceData.gst_type,
        cgst_rate: invoiceData.cgst_rate,
        sgst_rate: invoiceData.sgst_rate,
        igst_rate: invoiceData.igst_rate,
        cgst_amount: invoiceData.cgst_amount,
        sgst_amount: invoiceData.sgst_amount,
        igst_amount: invoiceData.igst_amount,
        total_amount: invoiceData.total_amount,
        notes: invoiceData.notes,
        payment_instructions: invoiceData.payment_instructions,
      }])
      .select()
      .single()

    if (invoiceError) return { success: false, error: invoiceError.message }

    // Create pending Income Entry
    await supabase.from('income_entries').insert([{
      invoice_id: invoice.id,
      customer_id: invoiceData.customer_id,
      invoice_number: invoiceData.invoice_number,
      invoice_date: invoiceData.invoice_date,
      description: `Invoice ${invoiceData.invoice_number}`,
      currency: invoiceData.currency,
      invoice_amount: invoiceData.total_amount,
      status: 'sent'
    }])

    // Increment Invoice Number sequence
    const { data: settings } = await supabase.from('agency_settings').select('id, invoice_next_number').single()
    if (settings) {
      await supabase.from('agency_settings').update({ invoice_next_number: settings.invoice_next_number + 1 }).eq('id', settings.id)
    }

    revalidatePath('/invoices')
    return { success: true, invoiceId: invoice.id }
  }
}

// Keep your existing deleteInvoice logic exactly as is!
export async function deleteInvoice(id: string) {
  const supabase = createClient()
  await supabase.from('income_entries').delete().eq('invoice_id', id).eq('status', 'sent')
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/invoices')
  return { success: true }
}