import React from "react";

export function Tooltip({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  const [show, setShow] = React.useState(false);

  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            marginBottom: 8,
            padding: "8px 10px",
            borderRadius: 8,
            background: "rgba(0, 0, 0, 0.8)",
            color: "#fff",
            fontSize: 12,
            whiteSpace: "nowrap",
            zIndex: 999,
            pointerEvents: "none",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className || ""}`} {...props}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`badge ${className || ""}`} {...props}>
      {children}
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.3)",
        borderTop: "2px solid var(--primary)",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

export function InfoTooltip({
  text,
  maxWidth = "280px",
}: {
  text: string;
  maxWidth?: string;
}) {
  const [show, setShow] = React.useState(false);

  return (
    <div
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
      role="button"
      title="Click for more info"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: "rgba(124, 124, 255, 0.2)",
        color: "var(--primary)",
        fontSize: 12,
        fontWeight: "bold",
        cursor: "pointer",
        marginLeft: 6,
        verticalAlign: "middle",
        overflow: "visible",
      }}
    >
      ℹ️
      {show && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 0,
            padding: 10,
            borderRadius: 8,
            background: "rgba(0, 0, 0, 0.95)",
            color: "#fff",
            fontSize: 13,
            maxWidth,
            whiteSpace: "normal",
            wordWrap: "break-word",
            zIndex: 999,
            pointerEvents: "auto",
            lineHeight: 1.5,
            border: "1px solid rgba(124, 124, 255, 0.3)",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
