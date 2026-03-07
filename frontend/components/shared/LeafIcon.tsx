import clsx from "clsx";

interface LeafIconProps {
  className?: string;
}

export default function LeafIcon({ className }: LeafIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={clsx("inline-block", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19.6 3.9C17.7 3.9 15.5 4.4 13.6 5.3C11.2 6.5 9.3 8 7.8 9.7C5.9 11.9 4.7 14.5 4.7 16.9C4.7 19.4 6.2 20.8 8.5 20.8C11 20.8 13.8 19.5 16.2 17.2C18.5 14.9 19.8 12 20.1 8.8C20.2 7 20.1 5.4 19.8 4.2C19.8 4 19.7 3.9 19.6 3.9Z"
        fill="currentColor"
      />
      <path
        d="M8.7 18C9.7 15.4 11.7 12.4 14.8 9.3"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M10.4 14.6C11.5 14 12.7 13.2 13.8 12.3"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}