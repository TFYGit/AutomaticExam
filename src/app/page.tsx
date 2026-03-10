export default function Home() {
  return (
    <main
      style={{
        fontFamily: 'sans-serif',
        maxWidth: 480,
        margin: '100px auto',
        textAlign: 'center',
        color: '#333',
        padding: '0 24px',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>自动考试系统</h1>
      <p style={{ color: '#888', lineHeight: 1.7 }}>系统运行中，每天定时将题目发送到你的邮箱。</p>
    </main>
  )
}
