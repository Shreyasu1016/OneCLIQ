import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#151412",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
          <circle cx="16" cy="15" r="8.5" fill="none" stroke="#f4f1ea" strokeWidth="2.4" />
          <path d="M16 10.5v8m0 0-3.2-3.2M16 18.5l3.2-3.2" stroke="#f4f1ea" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="24.5" cy="24.5" r="2.6" fill="#e5582b" />
        </svg>
      </div>
    ),
    size,
  );
}
