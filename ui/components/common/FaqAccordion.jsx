import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function FaqAccordion({ faqs = [], className = '' }) {
  const [open, setOpen] = useState(null)

  if (!faqs.length) return null

  return (
    <div className={`faq-accordion${className ? ` ${className}` : ''}`}>
      {faqs.map(f => {
        const isOpen = open === f.id
        return (
          <div key={f.id} className="faq-item card">
            <button
              type="button"
              className="faq-item-toggle"
              onClick={() => setOpen(isOpen ? null : f.id)}
              aria-expanded={isOpen}
            >
              <span>{f.question}</span>
              <ChevronDown
                size={20}
                className={`faq-item-chevron${isOpen ? ' faq-item-chevron--open' : ''}`}
              />
            </button>
            {isOpen && (
              <div className="faq-item-answer">{f.answer}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
