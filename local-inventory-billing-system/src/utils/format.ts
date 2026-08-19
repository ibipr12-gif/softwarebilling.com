export function formatCurrency(amount: number, symbol = 'Rs.'): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const parts = rounded.toFixed(0);
  // Add thousands separators (Pakistani/Indian style grouping is close enough with standard grouping)
  const withCommas = parts.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${symbol} ${withCommas}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
}
