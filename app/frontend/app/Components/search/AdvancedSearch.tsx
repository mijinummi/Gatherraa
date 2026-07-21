interface Props {
  value: string;
  onChange(value: string): void;
}

export function SearchInput({
  value,
  onChange,
}: Props) {
  return (
    <input
      type="search"
      placeholder="Search..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}