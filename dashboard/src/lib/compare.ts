// Commas are kept literal so the link reads like the documented `?rs=a,b,c` contract.
export const compareHref = (ids: string[], query?: string) => {
  const parts = [ids.length > 0 && `rs=${ids.join(",")}`, query && `q=${encodeURIComponent(query)}`].filter(Boolean).join("&");
  return parts ? `/bandingkan?${parts}` : "/bandingkan";
};
