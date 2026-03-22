import { isMissingEnv } from '@/lib/supabase'

export default function EnvGuard({ children }: { children: React.ReactNode }) {
  if (!isMissingEnv) return <>{children}</>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
        <div className="text-4xl">⚙️</div>
        <h1 className="text-xl font-bold text-gray-900">Configuração necessária</h1>
        <p className="text-gray-600 text-sm">
          As variáveis de ambiente do Supabase não foram encontradas. Configure-as na Vercel:
        </p>
        <div className="bg-gray-50 rounded-lg p-4 text-left text-sm font-mono space-y-1">
          <p className="text-rose-600">VITE_SUPABASE_URL</p>
          <p className="text-rose-600">VITE_SUPABASE_ANON_KEY</p>
        </div>
        <p className="text-xs text-gray-500">
          Acesse <strong>Vercel → Project → Settings → Environment Variables</strong> e adicione
          as chaves do seu projeto Supabase. Depois faça um novo deploy.
        </p>
      </div>
    </div>
  )
}
