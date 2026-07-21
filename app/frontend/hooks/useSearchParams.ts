import { useRouter, useSearchParams } from "next/navigation";

export function useSearchQuery() {
  const router = useRouter();
  const params = useSearchParams();

  function setSearch(value: string) {
    const search = new URLSearchParams(params.toString());

    search.set("search", value);

    router.replace(`?${search.toString()}`);
  }

  return {
    query: params.get("search") ?? "",
    setSearch,
  };
}