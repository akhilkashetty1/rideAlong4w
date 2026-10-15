import type { MetadataRoute } from "next";
import { FORM_META } from "@/lib/form-content";

/** Installable to the home screen, so line managers open it like an app before a ride along. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: FORM_META.title,
    short_name: FORM_META.shortTitle,
    description: FORM_META.description,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0c0f",
    theme_color: "#0a0c0f",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
