'use client'

import { useState } from 'react'
import questionsData from '@/data/questions.json'

interface Question {
  id: number
  type: 'choice' | 'multichoice' | 'truefalse'
  question: string
  options?: Record<string, string>
  answer: string | string[]
  explanation?: string
}

const ALL_QUESTIONS = questionsData as Question[]
const QUIZ_SIZE = Math.min(100, ALL_QUESTIONS.length)

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function checkCorrect(q: Question, userAnswer: string[]): boolean {
  if (q.type === 'multichoice') {
    const correct = (q.answer as string[]).slice().sort().join(',')
    const user = userAnswer.slice().sort().join(',')
    return correct === user
  }
  return q.answer === userAnswer[0]
}

const s = {
  body: { fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: '#f0f2f5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' } as React.CSSProperties,
  card: { background: 'white', borderRadius: 20, padding: '40px 32px', maxWidth: 600, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' } as React.CSSProperties,
}

// ── 开始页 ──────────────────────────────────────────────
function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div style={s.body}>
      <div style={{ ...s.card, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>📚</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>随机考试</h1>
        <p style={{ color: '#888', marginBottom: 8 }}>从题库中随机抽取 {QUIZ_SIZE} 道题</p>
        <p style={{ color: '#aaa', fontSize: 13, marginBottom: 32 }}>单选题 · 多选题 · 判断题</p>
        <button onClick={onStart} style={{ background: '#4a90d9', color: 'white', border: 'none', borderRadius: 12, padding: '16px 48px', fontSize: 17, fontWeight: 600, cursor: 'pointer' }}>
          开始答题
        </button>
      </div>
    </div>
  )
}

// ── 结果页 ──────────────────────────────────────────────
function ResultScreen({ correct, total, onRetry }: { correct: number; total: number; onRetry: () => void }) {
  const pct = Math.round((correct / total) * 100)
  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '👍' : pct >= 50 ? '📖' : '💪'
  return (
    <div style={s.body}>
      <div style={{ ...s.card, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{emoji}</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>考试完成！</h2>
        <div style={{ fontSize: 56, fontWeight: 800, color: pct >= 60 ? '#2e7d32' : '#c62828', marginBottom: 8 }}>{pct}%</div>
        <p style={{ color: '#666', marginBottom: 32 }}>答对 {correct} / {total} 题</p>
        <button onClick={onRetry} style={{ background: '#4a90d9', color: 'white', border: 'none', borderRadius: 12, padding: '14px 40px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
          再来一次
        </button>
      </div>
    </div>
  )
}

// ── 答题页 ──────────────────────────────────────────────
function QuizScreen({ questions, onFinish }: { questions: Question[]; onFinish: (correct: number) => void }) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [revealed, setRevealed] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)

  const q = questions[index]
  const total = questions.length
  const progress = ((index) / total) * 100

  const correct = revealed ? lastCorrect : null

  const [lastCorrect, setLastCorrect] = useState(false)

  function handleSingle(ans: string) {
    if (revealed) return
    const ok = checkCorrect(q, [ans])
    setSelected([ans])
    setRevealed(true)
    setLastCorrect(ok)
    if (ok) setCorrectCount(c => c + 1)
  }

  function toggleMulti(ans: string) {
    if (revealed) return
    setSelected(prev => prev.includes(ans) ? prev.filter(a => a !== ans) : [...prev, ans])
  }

  function submitMulti() {
    if (revealed || selected.length === 0) return
    const ok = checkCorrect(q, selected)
    setRevealed(true)
    setLastCorrect(ok)
    if (ok) setCorrectCount(c => c + 1)
  }

  function next() {
    if (index + 1 >= total) {
      onFinish(correctCount)
    } else {
      setIndex(i => i + 1)
      setSelected([])
      setRevealed(false)
      setLastCorrect(false)
    }
  }

  // option button color
  function optionStyle(key: string): React.CSSProperties {
    const isSelected = selected.includes(key)
    const isCorrectOpt = q.type === 'multichoice'
      ? (q.answer as string[]).includes(key)
      : q.answer === key

    let bg = '#f8f9fa'
    let border = '1px solid #e9ecef'
    let color = '#333'

    if (revealed) {
      if (isCorrectOpt) { bg = '#e8f5e9'; border = '2px solid #4CAF50'; color = '#2e7d32' }
      else if (isSelected && !isCorrectOpt) { bg = '#fce4ec'; border = '2px solid #f44336'; color = '#c62828' }
    } else if (isSelected) {
      bg = '#e3f2fd'; border = '2px solid #4a90d9'; color = '#1565c0'
    }

    return {
      display: 'block', width: '100%', textAlign: 'left', margin: '8px 0',
      padding: '14px 18px', background: bg, border, borderRadius: 10,
      color, fontSize: 15, cursor: revealed ? 'default' : 'pointer',
      transition: 'all 0.15s',
    }
  }

  const correctAnswer = Array.isArray(q.answer) ? (q.answer as string[]).join('、') : q.answer

  return (
    <div style={s.body}>
      <div style={s.card}>
        {/* 进度条 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 13, marginBottom: 6 }}>
            <span>第 {index + 1} / {total} 题</span>
            <span>{q.type === 'choice' ? '单选题' : q.type === 'multichoice' ? '多选题' : '判断题'}</span>
          </div>
          <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3 }}>
            <div style={{ height: '100%', background: '#4a90d9', borderRadius: 3, width: `${progress}%`, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* 题目 */}
        <h2 style={{ fontSize: 17, lineHeight: 1.7, color: '#1a1a2e', marginBottom: 20, fontWeight: 600 }}>
          {q.question}
        </h2>

        {/* 选项 */}
        {q.type === 'truefalse' ? (
          <div style={{ display: 'flex', gap: 12 }}>
            {['对', '错'].map(opt => (
              <button key={opt} onClick={() => handleSingle(opt)} style={{
                flex: 1, padding: '16px', borderRadius: 10, border: '1px solid #e9ecef',
                fontSize: 16, fontWeight: 700, cursor: revealed ? 'default' : 'pointer',
                background: revealed
                  ? (q.answer === opt ? '#e8f5e9' : (selected[0] === opt ? '#fce4ec' : '#f8f9fa'))
                  : (selected[0] === opt ? '#e3f2fd' : '#f8f9fa'),
                color: revealed
                  ? (q.answer === opt ? '#2e7d32' : (selected[0] === opt ? '#c62828' : '#333'))
                  : (selected[0] === opt ? '#1565c0' : '#333'),
                borderColor: revealed
                  ? (q.answer === opt ? '#4CAF50' : (selected[0] === opt ? '#f44336' : '#e9ecef'))
                  : (selected[0] === opt ? '#4a90d9' : '#e9ecef'),
              }}>
                {opt === '对' ? '✓ 对' : '✗ 错'}
              </button>
            ))}
          </div>
        ) : (
          <>
            {Object.entries(q.options ?? {}).map(([key, val]) => (
              <button key={key} onClick={() => q.type === 'choice' ? handleSingle(key) : toggleMulti(key)} style={optionStyle(key)}>
                <strong style={{ marginRight: 10, color: 'inherit' }}>{key}</strong>{val}
              </button>
            ))}
            {q.type === 'multichoice' && !revealed && (
              <button onClick={submitMulti} disabled={selected.length === 0} style={{
                marginTop: 8, width: '100%', padding: '14px', background: selected.length > 0 ? '#4a90d9' : '#ccc',
                color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
                cursor: selected.length > 0 ? 'pointer' : 'default',
              }}>
                提交答案（已选 {selected.length} 项）
              </button>
            )}
          </>
        )}

        {/* 答题结果 */}
        {revealed && (
          <div style={{ marginTop: 20, padding: '16px 20px', borderRadius: 12, background: correct ? '#e8f5e9' : '#fce4ec', borderLeft: `4px solid ${correct ? '#4CAF50' : '#f44336'}` }}>
            <div style={{ fontWeight: 700, color: correct ? '#2e7d32' : '#c62828', marginBottom: q.explanation ? 8 : 0 }}>
              {correct ? '✓ 回答正确！' : `✗ 回答错误，正确答案：${correctAnswer}`}
            </div>
            {q.explanation && <div style={{ color: '#555', fontSize: 14, lineHeight: 1.6 }}>{q.explanation}</div>}
          </div>
        )}

        {/* 下一题按钮 */}
        {revealed && (
          <button onClick={next} style={{
            marginTop: 16, width: '100%', padding: '14px', background: '#1a1a2e',
            color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>
            {index + 1 >= total ? '查看成绩' : '下一题 →'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── 主组件 ──────────────────────────────────────────────
export default function QuizPage() {
  const [phase, setPhase] = useState<'start' | 'quiz' | 'done'>('start')
  const [questions, setQuestions] = useState<Question[]>([])
  const [finalScore, setFinalScore] = useState(0)

  function startQuiz() {
    setQuestions(shuffle(ALL_QUESTIONS).slice(0, QUIZ_SIZE))
    setPhase('quiz')
  }

  function handleFinish(correct: number) {
    setFinalScore(correct)
    setPhase('done')
  }

  if (phase === 'start') return <StartScreen onStart={startQuiz} />
  if (phase === 'done') return <ResultScreen correct={finalScore} total={QUIZ_SIZE} onRetry={() => setPhase('start')} />
  return <QuizScreen questions={questions} onFinish={handleFinish} />
}
