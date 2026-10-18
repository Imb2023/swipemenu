export function selectSpecials(rows) {
  if (!Array.isArray(rows)) throw new Error('Menu must be an array');
  const text = value => String(value ?? '').trim();
  const available = value => value === true || value === 1 || ['true','yes','1'].includes(text(value).toLowerCase());
  return rows.filter(row => row && typeof row === 'object' && text(row.name) && available(row.available) && /^specials?$/i.test(text(row.category)))
    .map(row => ({id:text(row.id),name:text(row.name),category:'Specials',description:text(row.description),price:text(row.price),image:text(row.image),video:text(row.video),available:true,featured:available(row.featured),order:Number.isFinite(Number(row.order)) && text(row.order) !== '' ? Number(row.order) : 9999}))
    .sort((a,b) => a.order-b.order).slice(0,3);
}
