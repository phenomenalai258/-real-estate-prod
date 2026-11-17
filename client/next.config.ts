import type { NextConfig } from "next";

const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL
  ? new URL(process.env.NEXT_PUBLIC_IMAGE_BASE_URL)
  : undefined;
if (imageBase && (imageBase.protocol !== "https:" || imageBase.username || imageBase.password || imageBase.search || imageBase.hash || imageBase.pathname !== "/")) {
  throw new Error("NEXT_PUBLIC_IMAGE_BASE_URL deve indicar a origem HTTPS das fotografias.");
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(imageBase ? [{ protocol: "https" as const, hostname: imageBase.hostname, port: imageBase.port, pathname: "/properties/**", search: "" }] : []),
      {
        protocol: "https",
        hostname: "example.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
