type IconName =
  | "sparkles"
  | "gallery"
  | "shield"
  | "team"
  | "message"
  | "phone"
  | "whatsapp"
  | "check"
  | "calendar";

type IconProps = {
  name: IconName;
  className?: string;
};

export function Icon({ name, className = "h-6 w-6" }: IconProps) {
  const props = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };

  if (name === "sparkles") {
    return (
      <svg {...props}>
        <path d="M12 3l1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1L6.5 8.5l4.1-1.4L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M18.5 13l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2ZM5.5 14l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "gallery") {
    return (
      <svg {...props}>
        <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 16.5v-9Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="m7.5 15 2.4-2.5a1 1 0 0 1 1.45.02L13 14.4l1.25-1.25a1 1 0 0 1 1.45.04L18 15.8M15.5 8.8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...props}>
        <path d="M12 3.8 18.5 6v5.2c0 4.1-2.7 7.2-6.5 9-3.8-1.8-6.5-4.9-6.5-9V6L12 3.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "team") {
    return (
      <svg {...props}>
        <path d="M9.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4.5 19a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 10.5a2.4 2.4 0 1 0 0-4.8M17.5 18.5a4 4 0 0 0-2.2-3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "message" || name === "whatsapp") {
    return (
      <svg {...props}>
        <path d="M7 5.5h10A2.5 2.5 0 0 1 19.5 8v5.5A2.5 2.5 0 0 1 17 16h-4.4L8 19.5V16H7a2.5 2.5 0 0 1-2.5-2.5V8A2.5 2.5 0 0 1 7 5.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8 9.5h8M8 12.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...props}>
        <path d="M8.2 5.3 10 8.9l-1.5 1.5c.8 1.8 2.3 3.3 4.1 4.1l1.5-1.5 3.6 1.8-.5 2.5c-.2.8-.9 1.3-1.7 1.2C9.8 17.8 6.2 14.2 5.5 8.5c-.1-.8.4-1.5 1.2-1.7l1.5-.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...props}>
        <path d="M7.5 4.5v3M16.5 4.5v3M5 9h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 6h10a2.5 2.5 0 0 1 2.5 2.5V17A2.5 2.5 0 0 1 17 19.5H7A2.5 2.5 0 0 1 4.5 17V8.5A2.5 2.5 0 0 1 7 6Z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <path d="m6 12 4 4 8-8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
