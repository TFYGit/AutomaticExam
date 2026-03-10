import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import questionsData from '@/data/questions.json'

interface Question {
  id: number
  type: string
  question: string
  options?: Record<string, string>
  answer: string | string[]
  explanation?: string
}

function verify(qid: string, correct: string, sig: string): boolean {
  const expected = createHmac('sha256', process.env.ANSWER_SECRET!)
    .update(`${qid}:${correct}`)
    .digest('hex')
  return expected === sig
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const qid = searchParams.get('qid') ?? ''
  const userAnswer = searchParams.get('user_answer') ?? ''  // 单选/判断有值，多选为空
  const correct = searchParams.get('correct') ?? ''          // 单选: "A"，多选: "A,B,C"，判断: "对"/"错"
  const sig = searchParams.get('sig') ?? ''

  if (!verify(qid, correct, sig)) {
    return new NextResponse('无效请求', { status: 400 })
  }

  const question = (questionsData as Question[]).find(q => q.id === parseInt(qid))
  const isMulti = question?.type === 'multichoice'

  // 多选题只展示答案，不判断对错
  const isCorrect = isMulti ? null : userAnswer === correct

  // 多选题答案展示为 "A、B、C"
  const correctDisplay = correct.includes(',') ? correct.split(',').join('、') : correct

  const resultBlock = isMulti
    ? `
      <div class="badge">📋</div>
      <div class="title neutral">正确答案</div>
      <div class="meta">本题为多选题，正确答案为：<strong>${correctDisplay}</strong></div>`
    : `
      <div class="badge">${isCorrect ? '🎉' : '😅'}</div>
      <div class="title ${isCorrect ? 'correct' : 'wrong'}">${isCorrect ? '回答正确！' : '回答错误'}</div>
      <div class="meta">
        你的答案：<strong>${userAnswer}</strong>
        ${!isCorrect ? `<br>正确答案：<strong>${correctDisplay}</strong>` : ''}
      </div>`

  const html = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>答题结果</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f0f2f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 40px 32px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.08);
    }
    .badge { font-size: 60px; text-align: center; margin-bottom: 16px; }
    .title { font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 10px; }
    .title.correct { color: #2e7d32; }
    .title.wrong { color: #c62828; }
    .title.neutral { color: #1a5276; }
    .meta { text-align: center; color: #888; font-size: 15px; margin-bottom: 28px; line-height: 1.8; }
    .meta strong { color: #333; font-size: 17px; }
    .explanation {
      background: #f8f9fa;
      border-left: 4px solid #4a90d9;
      border-radius: 0 12px 12px 0;
      padding: 18px 20px;
    }
    .explanation-label { font-size: 12px; color: #4a90d9; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.5px; }
    .explanation-text { font-size: 15px; color: #444; line-height: 1.7; }
  </style>
</head>
<body>
  <div class="card">
    ${resultBlock}
    ${
      question?.explanation
        ? `<div class="explanation">
        <div class="explanation-label">📖 解析</div>
        <div class="explanation-text">${question.explanation}</div>
      </div>`
        : ''
    }
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
