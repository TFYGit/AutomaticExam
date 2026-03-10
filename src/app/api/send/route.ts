import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createHmac } from 'crypto'
import questionsData from '@/data/questions.json'

const resend = new Resend(process.env.RESEND_API_KEY)

interface ChoiceQuestion {
  id: number
  type: 'choice'
  question: string
  options: Record<string, string>
  answer: string
  explanation?: string
}

interface MultiChoiceQuestion {
  id: number
  type: 'multichoice'
  question: string
  options: Record<string, string>
  answer: string[]
  explanation?: string
}

interface TrueFalseQuestion {
  id: number
  type: 'truefalse'
  question: string
  answer: string
  explanation?: string
}

type Question = ChoiceQuestion | MultiChoiceQuestion | TrueFalseQuestion

// 将答案统一序列化为字符串用于签名
function answerToString(answer: string | string[]): string {
  return Array.isArray(answer) ? answer.sort().join(',') : answer
}

function sign(qid: number, answer: string | string[]): string {
  return createHmac('sha256', process.env.ANSWER_SECRET!)
    .update(`${qid}:${answerToString(answer)}`)
    .digest('hex')
}

function typeLabel(type: string): string {
  if (type === 'choice') return '单选题'
  if (type === 'multichoice') return '多选题'
  return '判断题'
}

function buildEmailHtml(question: Question, baseUrl: string): string {
  const sig = sign(question.id, question.answer)
  const date = new Date().toLocaleDateString('zh-CN')
  const correctEncoded = encodeURIComponent(answerToString(question.answer))

  const revealUrl = `${baseUrl}/api/answer?qid=${question.id}&correct=${correctEncoded}&sig=${sig}`

  const answerUrl = (userAnswer: string) =>
    `${revealUrl}&user_answer=${encodeURIComponent(userAnswer)}`

  const header = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="color:#888;font-size:13px;margin-bottom:12px;">📅 ${date} · ${typeLabel(question.type)}</div>
      <h2 style="color:#1a1a2e;font-size:18px;line-height:1.7;margin:0 0 24px;font-weight:600;">${question.question}</h2>`

  // 单选题：每个选项都是可点击链接
  if (question.type === 'choice') {
    const options = Object.entries(question.options)
      .map(
        ([key, value]) => `
        <a href="${answerUrl(key)}" style="display:block;margin:8px 0;padding:14px 18px;background:#f8f9fa;border:1px solid #e9ecef;border-radius:10px;text-decoration:none;color:#333;font-size:15px;">
          <strong style="color:#4a90d9;margin-right:10px;">${key}</strong>${value}
        </a>`
      )
      .join('')
    return (
      header +
      options +
      `<p style="color:#bbb;font-size:12px;margin-top:28px;border-top:1px solid #f0f0f0;padding-top:16px;">点击选项提交答案，立即查看结果和解析</p></div>`
    )
  }

  // 多选题：展示选项 + 一个"查看答案"按钮（自行判断后再点）
  if (question.type === 'multichoice') {
    const options = Object.entries(question.options)
      .map(
        ([key, value]) => `
        <div style="margin:8px 0;padding:14px 18px;background:#f8f9fa;border:1px solid #e9ecef;border-radius:10px;color:#333;font-size:15px;">
          <strong style="color:#4a90d9;margin-right:10px;">${key}</strong>${value}
        </div>`
      )
      .join('')
    return (
      header +
      options +
      `<div style="margin-top:20px;">
        <a href="${revealUrl}" style="display:inline-block;padding:14px 32px;background:#4a90d9;border-radius:10px;text-decoration:none;color:white;font-size:15px;font-weight:600;">查看正确答案</a>
      </div>
      <p style="color:#bbb;font-size:12px;margin-top:20px;border-top:1px solid #f0f0f0;padding-top:16px;">先思考再点击查看答案</p></div>`
    )
  }

  // 判断题
  return (
    header +
    `
    <a href="${answerUrl('对')}" style="display:inline-block;margin:8px 8px 8px 0;padding:14px 44px;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:10px;text-decoration:none;color:#2e7d32;font-size:16px;font-weight:700;">✓ 对</a>
    <a href="${answerUrl('错')}" style="display:inline-block;margin:8px;padding:14px 44px;background:#fce4ec;border:1px solid #ef9a9a;border-radius:10px;text-decoration:none;color:#c62828;font-size:16px;font-weight:700;">✗ 错</a>
    <p style="color:#bbb;font-size:12px;margin-top:28px;border-top:1px solid #f0f0f0;padding-top:16px;">点击选项提交答案，立即查看结果和解析</p></div>`
  )
}

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const questions = questionsData as Question[]

  // 按年内第几天轮换题目，同一天多次触发发同一题
  const start = new Date(new Date().getFullYear(), 0, 0).getTime()
  const dayOfYear = Math.floor((Date.now() - start) / 86400000)
  const question = questions[dayOfYear % questions.length]

  const baseUrl = process.env.APP_URL!

  const quizUrl = `${baseUrl}/quiz`
  const emailHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">📚</div>
      <h2 style="color:#1a1a2e;font-size:22px;margin-bottom:8px;">今日考试提醒</h2>
      <p style="color:#666;margin-bottom:32px;">题库随机抽取 100 题，点击下方按钮开始答题</p>
      <a href="${quizUrl}" style="display:inline-block;padding:16px 48px;background:#4a90d9;color:white;border-radius:12px;text-decoration:none;font-size:17px;font-weight:600;">
        开始答题
      </a>
      <p style="color:#bbb;font-size:12px;margin-top:32px;">${new Date().toLocaleDateString('zh-CN')}</p>
    </div>`

  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: process.env.TO_EMAIL!,
    subject: `📝 今日考试 — ${new Date().toLocaleDateString('zh-CN')}`,
    html: emailHtml,
  })

  return NextResponse.json({ ok: true, questionId: question.id })
}
