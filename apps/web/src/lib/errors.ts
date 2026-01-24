export function formatApiError(err: any): string {
  try {
    if (!err) return "Something went wrong.";

    if (typeof err === "string") return prettify(err);

    if (typeof err.message === "string") return prettify(err.message);

    const fieldErrors = (err.fieldErrors || err.errors || null) as Record<
      string,
      string[]
    > | null;
    const formErrors = (err.formErrors || null) as string[] | null;

    const parts: string[] = [];
    if (formErrors && formErrors.length) {
      parts.push(...formErrors.map(prettify));
    }

    if (fieldErrors) {
      for (const [field, messages] of Object.entries(fieldErrors)) {
        if (!messages || !messages.length) continue;
        const niceField = toLabel(field);
        const niceMsgs = messages.map(prettify).join("; ");
        parts.push(`${niceField}: ${niceMsgs}`);
      }
    }

    if (parts.length) return parts.join(" \u2022 ");

    return prettify(JSON.stringify(err));
  } catch {
    return "Unexpected error. Please try again.";
  }
}

function toLabel(field: string): string {
  const map: Record<string, string> = {
    slug: "Slug",
    name: "Name",
    email: "Email",
    password: "Password",
  };
  return map[field] || capitalize(field.replace(/_/g, " "));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function prettify(msg: string): string {
  let m = msg;
  m = m.replace(
    /Too small: expected string to have >=\s*2 characters/gi,
    "must be at least 2 characters",
  );
  m = m.replace(
    /String must contain at least 1 character\(s\)/gi,
    "can't be empty",
  );
  m = m.replace(
    /Invalid string: must match pattern \/\[a-z0-9-\]\+\$\//gi,
    "use lowercase letters, numbers, and hyphens only",
  );
  m = m.replace(/Invalid string: must match pattern[^\n]*/gi, "invalid format");
  m = m.replace(/Invalid input/gi, "invalid value");

  m = m.replace(/^\{+|\}+$/g, "");
  return m.trim();
}
