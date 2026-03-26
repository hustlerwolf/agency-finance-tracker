'use client'

import { FileText } from 'lucide-react'

// 1. Define the shapes of the data to satisfy TypeScript
interface LineItem {
  description: string;
  sac_hsn: string;
  qty: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  currency: string;
  type: string;
  subtotal: number;
  gst_type: string;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  line_items: LineItem[];
  customers: {
    name: string;
    address: string | null;
    gstin: string | null;
  } | null;
}

interface SettingsData {
  name?: string;
  gstin?: string;
}

// 2. Apply the types to the component props (No more 'any'!)
export function ViewPdfButton({ invoice, settings }: { invoice: InvoiceData, settings: SettingsData }) {
  const handleViewPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    const agencyName = settings?.name || 'Onlee Agency'
    const currency = invoice.currency
    const customer = invoice.customers

    // Header
    doc.setFontSize(20)
    doc.text("INVOICE", 14, 22)
    doc.setFontSize(10)
    doc.text(agencyName, 14, 30)
    if (settings?.gstin) doc.text(`GSTIN: ${settings.gstin}`, 14, 35)

    // Invoice Details
    doc.text(`Invoice #: ${invoice.invoice_number}`, 130, 22)
    doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}`, 130, 27)
    if (invoice.due_date) doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-IN')}`, 130, 32)

    // Bill To
    doc.text("Bill To:", 14, 50)
    doc.setFont('', 'bold')
    doc.text(customer?.name || '', 14, 55)
    doc.setFont('', 'normal')
    if (customer?.address) doc.text(customer.address, 14, 60)
    if (invoice.type === 'indian' && customer?.gstin) doc.text(`GSTIN: ${customer.gstin}`, 14, 65)

    // Table - Applying the LineItem type here too
    const tableData = invoice.line_items.map((item: LineItem) => [
      item.description,
      item.sac_hsn,
      item.qty.toString(),
      `${currency} ${item.rate.toFixed(2)}`,
      `${currency} ${(item.qty * item.rate).toFixed(2)}`
    ])

    autoTable(doc, {
      startY: 75,
      head: [['Description', 'SAC/HSN', 'Qty', 'Rate', 'Amount']],
      body: tableData,
    })

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

    // Totals
    doc.text(`Subtotal:`, 130, finalY)
    doc.text(`${currency} ${invoice.subtotal.toFixed(2)}`, 170, finalY)

    let currentY = finalY + 7
    if (invoice.type === 'indian') {
      if (invoice.gst_type === 'cgst_sgst') {
        doc.text(`CGST:`, 130, currentY)
        doc.text(`${currency} ${invoice.cgst_amount?.toFixed(2) || '0.00'}`, 170, currentY)
        currentY += 7
        doc.text(`SGST:`, 130, currentY)
        doc.text(`${currency} ${invoice.sgst_amount?.toFixed(2) || '0.00'}`, 170, currentY)
      } else if (invoice.gst_type === 'igst') {
        doc.text(`IGST:`, 130, currentY)
        doc.text(`${currency} ${invoice.igst_amount?.toFixed(2) || '0.00'}`, 170, currentY)
      }
      currentY += 7
    }

    doc.setFont('', 'bold')
    doc.text(`Total:`, 130, currentY)
    doc.text(`${currency} ${invoice.total_amount.toFixed(2)}`, 170, currentY)

    // Open in New Tab
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  return (
    <button onClick={handleViewPDF} className="flex items-center text-blue-600 hover:underline text-sm font-medium">
      <FileText className="h-4 w-4 mr-1" /> View PDF
    </button>
  )
}