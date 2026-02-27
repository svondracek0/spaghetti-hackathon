import { useState } from 'react'
import './App.css'

function App() {
  const [formData, setFormData] = useState({
    opponents: '',
    context: '',
    topics: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    console.log('Submitting Debate Prep:', formData)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      alert('Debate preparation research started!')
    }, 1500)
  }

  return (
    <div className="app-container fade-in">
      <header className="hero-section">
        <h1 className="title">Debate <span className="accent">Strategist</span></h1>
        <p className="subtitle">Master every argument with AI-driven research and preparation.</p>
      </header>

      <main className="form-container glass-panel">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="opponents">Debate Opponents</label>
            <input
              type="text"
              id="opponents"
              name="opponents"
              placeholder="e.g. John Doe, Sarah Smith..."
              value={formData.opponents}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="context">Debate Context</label>
            <textarea
              id="context"
              name="context"
              rows="4"
              placeholder="Describe the occasion, setting, and rules of the debate..."
              value={formData.context}
              onChange={handleChange}
              required
            ></textarea>
          </div>

          <div className="input-group">
            <label htmlFor="topics">Key Topics & Keywords</label>
            <input
              type="text"
              id="topics"
              name="topics"
              placeholder="e.g. Economy, Healthcare, Foreign Policy..."
              value={formData.topics}
              onChange={handleChange}
              required
            />
          </div>

          <div className="action-container">
            <button
              type="submit"
              className={`premium-btn ${isSubmitting ? 'loading' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Analyzing...' : 'Prepare Debate Strategy'}
            </button>
          </div>
        </form>
      </main>

      <footer className="footer-credits">
        <p>&copy; 2026 Debate Strategist. Powered by Newsmatics Hackathon.</p>
      </footer>
    </div>
  )
}

export default App
