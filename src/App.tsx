import { useState } from 'react'
import { Home } from './screens/Home'
import { Run, type RunResult } from './screens/Run'
import { loadSave, persistSave, type SaveData } from './game/store'

type Screen = { name: 'home' } | { name: 'run'; moduleId: string; isBoss: boolean }

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave())
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  return (
    <div className="app">
      <div className="bg-glow g1" />
      <div className="bg-glow g2" />
      {screen.name === 'home' ? (
        <Home save={save} onStart={(moduleId, isBoss) => setScreen({ name: 'run', moduleId, isBoss })} />
      ) : (
        <Run
          key={`${screen.moduleId}:${screen.isBoss ? 'boss' : 'run'}`}
          moduleId={screen.moduleId}
          isBoss={screen.isBoss}
          save={save}
          onExit={(r: RunResult) => {
            setSave(r.save)
            persistSave(r.save)
            setScreen(r.nextModuleId ? { name: 'run', moduleId: r.nextModuleId, isBoss: false } : { name: 'home' })
          }}
        />
      )}
    </div>
  )
}
