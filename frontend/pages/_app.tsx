import type { AppProps } from "next/app"
import { useRouter } from "next/router"
import SidebarLayout from "../components/SidebarLayout"
import { Toaster } from "sonner"
import "../styles/globals.css"

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const isAuthPage = router.pathname === "/"

  const content = <Component {...pageProps} />

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      {isAuthPage ? content : <SidebarLayout>{content}</SidebarLayout>}
    </>
  )
}
