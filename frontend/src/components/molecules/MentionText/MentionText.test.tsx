import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MentionText } from './MentionText'

describe('MentionText', () => {
  it('menyorot hanya nama yang ditandai', () => {
    const { container } = render(
      <p>
        <MentionText text="@Ahmad bisa dicek? cc @Rama dan @Siapa" names={['Ahmad', 'Rama']} />
      </p>,
    )

    const marks = [...container.querySelectorAll('.ar-mention')].map((el) => el.textContent)
    expect(marks).toEqual(['@Ahmad', '@Rama'])
    expect(container.textContent).toBe('@Ahmad bisa dicek? cc @Rama dan @Siapa')
  })

  it('HTML di dalam teks tetap teks biasa', () => {
    render(
      <p>
        <MentionText text={'<img src=x onerror="alert(1)"> @Rama'} names={['Rama']} />
      </p>,
    )

    expect(document.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument()
  })
})
