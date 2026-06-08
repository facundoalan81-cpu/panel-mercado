import { clerkMiddleware } from "@clerk/nextjs/server";

// Auth OPCIONAL: clerkMiddleware habilita el contexto de sesión pero NO protege ninguna ruta.
// Todo el panel es público (link abierto); el login solo sirve para sincronizar "Mi lista".
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
