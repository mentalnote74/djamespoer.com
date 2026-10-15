import runpy
from pathlib import Path
import unittest

redact = runpy.run_path(str(Path(__file__).with_name('thingamajob_resume_redaction.py')))['redact']


class RedactionTest(unittest.TestCase):
    def fixture(self):
        texts = ['D. James Poer', 'Fictional Developer', '123 Fictional Street',
                 'Contact Information', '555-123-4567', 'fictional@example.invalid',
                 'linkedin.com/in/fictional', 'Over 20 years developing Drive applications, 2001–2021.',
                 'Fictional Employer · Developer · 2015–2019 · TypeScript']
        return [{'part': 'word/document.xml', 'paragraph': i, 'text': text}
                for i, text in enumerate(texts, 1)]

    def test_contact_only_redaction_preserves_every_career_paragraph(self):
        source = self.fixture()
        result, changes, unchanged = redact(source)
        self.assertEqual(len(changes), 6)
        self.assertEqual(unchanged, 3)
        for index in [1, 7, 8]:
            self.assertEqual(result[index], source[index])
        self.assertEqual(source[2]['text'], '123 Fictional Street')
        for index in [0, 2, 4, 5, 6]:
            self.assertNotIn(source[index]['text'], '\n'.join(r['text'] for r in result))

    def test_changed_header_or_contact_elsewhere_fails_closed(self):
        source = self.fixture()
        source[3]['text'] = 'Unexpected layout'
        with self.assertRaises(ValueError):
            redact(source)
        source = self.fixture()
        source.append({'part': 'word/footer1.xml', 'paragraph': 1, 'text': 'other@example.invalid'})
        with self.assertRaises(ValueError):
            redact(source)


if __name__ == '__main__':
    unittest.main()
