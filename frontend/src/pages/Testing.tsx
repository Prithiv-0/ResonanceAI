import { useState } from 'react'
import { CheckCircle2, Play, RefreshCw, XCircle } from 'lucide-react'
import { Badge, PageHeader, Panel, Spinner } from '../components/ui'
import { useSession } from '../state/session'
import { TESTS } from '../tests/suite'
import type { TestCase, TestEnv } from '../tests/suite'

export default function Testing() {
  const { state, getCurrentState, patch, setTestResult, clearTests } = useSession()
  const [running, setRunning] = useState(false)
  const [filterCat, setFilterCat] = useState<string>('All')

  const testMap = state.tests || {}

  const categories = ['All', ...Array.from(new Set(TESTS.map((t) => t.category)))]

  const runSingle = async (test: TestCase, env: TestEnv) => {
    setTestResult(test.id, { status: 'running', observed: 'Executing test…' })
    const t0 = performance.now()
    try {
      const outcome = await test.run(env)
      const durationMs = Math.round(performance.now() - t0)
      setTestResult(test.id, {
        status: 'passed',
        observed: outcome,
        durationMs,
        ranAt: new Date().toLocaleTimeString(),
      })
    } catch (e) {
      const durationMs = Math.round(performance.now() - t0)
      setTestResult(test.id, {
        status: 'failed',
        observed: e instanceof Error ? e.message : 'Test failed unexpectedly',
        durationMs,
        ranAt: new Date().toLocaleTimeString(),
      })
    }
  }

  const runAll = async () => {
    if (running) return
    setRunning(true)
    const env: TestEnv = {
      setModelId: (id) => patch({ modelId: id }),
      setNoiseCondition: (cond) => patch({ noiseCondition: cond }),
      setSeed: (s) => patch({ settings: { ...getCurrentState().settings, seed: s } }),
      readStored: () => {
        try {
          const raw = sessionStorage.getItem('resonance.session.v1')
          return raw ? JSON.parse(raw) : null
        } catch {
          return null
        }
      },
      currentModelId: () => getCurrentState().modelId,
      currentNoiseCondition: () => getCurrentState().noiseCondition,
      currentSeed: () => getCurrentState().settings.seed,
    }


    for (const test of TESTS) {
      await runSingle(test, env)
    }
    setRunning(false)
  }

  const passedCount = TESTS.filter((t) => testMap[t.id]?.status === 'passed').length
  const failedCount = TESTS.filter((t) => testMap[t.id]?.status === 'failed').length
  const totalCount = TESTS.length

  const filteredTests = filterCat === 'All' ? TESTS : TESTS.filter((t) => t.category === filterCat)

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Verification & Test Suite"
        description="Comprehensive verification suite testing audio ingestion, playback, classification consistency, probability normalization, noise injection, and UI state integrity."
        actions={
          <div className="flex items-center gap-2">
            <button
              data-testid="run-all-tests"
              className="btn btn-primary"
              disabled={running}
              onClick={() => void runAll()}
            >
              {running ? <Spinner label="Running Suite…" /> : <><Play size={14} /> Run All Tests</>}
            </button>
            <button
              className="btn btn-secondary"
              disabled={running}
              onClick={() => clearTests()}
            >
              <RefreshCw size={13} /> Reset Results
            </button>
          </div>
        }
      />

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Panel className="p-4">
          <div className="label">Total Test Cases</div>
          <div className="mt-1 text-2xl font-bold text-navy-950">{totalCount}</div>
          <div className="text-[11px] text-navy-500">Core functional suites</div>
        </Panel>
        <Panel className="p-4">
          <div className="label">Passed</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{passedCount}</div>
          <div className="text-[11px] text-navy-500">{totalCount > 0 ? `${((passedCount / totalCount) * 100).toFixed(0)}% coverage` : '0%'}</div>
        </Panel>
        <Panel className="p-4">
          <div className="label">Failed</div>
          <div className="mt-1 text-2xl font-bold text-red-700">{failedCount}</div>
          <div className="text-[11px] text-navy-500">Regression checks</div>
        </Panel>
        <Panel className="p-4">
          <div className="label">Execution Status</div>
          <div className="mt-1 text-base font-semibold text-navy-900">
            {running ? <span className="inline-flex items-center gap-1 text-brand-700"><Spinner /> Executing</span> : passedCount === totalCount && totalCount > 0 ? <Badge tone="good">All Tests Passed</Badge> : <Badge tone="neutral">Ready</Badge>}
          </div>
          <div className="text-[11px] text-navy-500">Live test harness</div>
        </Panel>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-navy-200 pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              filterCat === cat ? 'bg-brand-700 text-white' : 'bg-navy-50 text-navy-700 hover:bg-navy-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Test Table */}
      <Panel title="Verification Test Matrix" subtitle="Detailed assertions and observed outcomes" pad={false}>
        <div className="overflow-x-auto">
          <table className="tbl" data-testid="test-matrix">
            <thead>
              <tr>
                <th className="w-16">Test ID</th>
                <th className="w-28">Category</th>
                <th className="w-64">Description</th>
                <th>Expected Outcome</th>
                <th>Observed Outcome</th>
                <th className="w-28 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTests.map((test) => {
                const res = testMap[test.id]
                const status = res?.status ?? 'not-run'
                return (
                  <tr key={test.id} data-testid={`test-row-${test.id}`}>
                    <td className="mono font-semibold text-brand-800">{test.id}</td>
                    <td><Badge tone="steel">{test.category}</Badge></td>
                    <td className="text-xs font-medium text-navy-900">{test.description}</td>
                    <td className="text-xs text-navy-600">{test.expected}</td>
                    <td className="text-xs font-mono text-navy-800">
                      {res?.observed ?? <span className="text-navy-400 italic">Pending execution</span>}
                      {res?.durationMs && <span className="ml-2 text-[10px] text-navy-500">({res.durationMs}ms)</span>}
                    </td>
                    <td className="text-right">
                      {status === 'passed' && (
                        <Badge tone="good"><CheckCircle2 size={12} /> Passed</Badge>
                      )}
                      {status === 'failed' && (
                        <Badge tone="bad"><XCircle size={12} /> Failed</Badge>
                      )}
                      {status === 'running' && (
                        <Badge tone="steel"><Spinner /> Running</Badge>
                      )}
                      {status === 'not-run' && (
                        <Badge tone="neutral">Not Run</Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
