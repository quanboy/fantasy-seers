export function withPlayerSearchQuery(searchParams, value) {
  const nextParams = new URLSearchParams(searchParams);
  if (value) nextParams.set("q", value);
  else nextParams.delete("q");
  return nextParams;
}
