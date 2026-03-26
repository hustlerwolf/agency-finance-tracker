import { createClient } from '@/lib/supabase/server'
import { ForexChart } from './forex-chart'

interface RawIncome {
  invoice_number: string;
  currency: string;
  invoice_amount: number;
  inr_received: number;
  payment_date: string; // We use this to look up the historical rate
  customers: { name: string } | { name: string }[] | null;
}

async function getHistoricalRate(date: string, currency: string) {
  try {
    // Frankfurter is a great open-source API for historical rates
    const response = await fetch(`https://api.frankfurter.app/${date}?from=${currency}&to=INR`);
    const data = await response.json();
    return data.rates.INR || 0;
  } catch (error) {
    console.error("Forex API Error:", error);
    return 0;
  }
}

export default async function ForexReportPage() {
  const supabase = createClient()

  const { data: income } = await supabase
    .from('income_entries')
    .select(`
      invoice_number,
      currency,
      invoice_amount,
      inr_received,
      payment_date,
      customers ( name )
    `)
    .neq('currency', 'INR')
    .eq('status', 'paid') as { data: RawIncome[] | null }

  // Process data and fetch market rates for each payment date
  const tableData = await Promise.all((income || []).map(async (inc) => {
    const customerData = Array.isArray(inc.customers) ? inc.customers[0] : inc.customers
    
    // Get the market rate on the day you were actually paid
    const marketRate = await getHistoricalRate(inc.payment_date, inc.currency);
    
    // What you SHOULD have received at mid-market rates
    const idealInr = marketRate * inc.invoice_amount;
    
    // The "Leakage" (Fees + Spread)
    const leakage = idealInr - inc.inr_received;
    const leakagePercent = idealInr > 0 ? (leakage / idealInr) * 100 : 0;

    return {
      invoice: inc.invoice_number || 'Direct',
      client: customerData?.name || 'Unknown',
      date: inc.payment_date,
      marketRate: marketRate.toFixed(2),
      effectiveRate: (inc.inr_received / inc.invoice_amount).toFixed(2),
      leakage: leakage > 0 ? leakage : 0,
      leakagePercent: leakagePercent > 0 ? leakagePercent.toFixed(1) : "0",
      received: inc.inr_received
    }
  }));

  const totalLeakage = tableData.reduce((sum, item) => sum + item.leakage, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Forex Leakage & Fees</h2>
        <p className="text-muted-foreground">Automated comparison of Market Mid-Rates vs. Your Bank Deposits.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 h-[450px] border rounded-md p-6 bg-slate-50">
          <ForexChart data={tableData} />
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-red-600 text-white rounded-md shadow-md">
            <h3 className="text-sm font-medium opacity-80">Total Leakage (Fees)</h3>
            <p className="text-2xl font-bold mt-1">₹{totalLeakage.toLocaleString('en-IN')}</p>
            <p className="text-xs mt-2 opacity-70 italic">* Money lost to bank spreads & platform fees.</p>
          </div>
          
          <div className="border rounded-md bg-white overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b text-xs font-bold uppercase text-slate-500">
              Payment Efficiency
            </div>
            <div className="divide-y max-h-[300px] overflow-y-auto">
              {tableData.map((item, idx) => (
                <div key={idx} className="px-4 py-3 text-xs">
                  <div className="flex justify-between font-bold mb-1">
                    <span>{item.invoice}</span>
                    <span className="text-red-600">-{item.leakagePercent}%</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Market: ₹{item.marketRate}</span>
                    <span>Actual: ₹{item.effectiveRate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}