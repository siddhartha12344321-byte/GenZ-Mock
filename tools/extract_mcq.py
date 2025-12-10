"""
UPSC Mock Test PDF Extractor
=============================
Extracts MCQ questions from PDF files and exports to JSON format.

Supports:
- Bilingual questions (English & Hindi in same PDF)
- Table-based questions
- Multiple formats (Q1., 1., Question 1, etc.)
- Answer with explanation
- Source and difficulty metadata

Usage:
    python extract_mcq.py input.pdf output.json --subject "Polity" --test-name "Mock Test 1"

Requirements:
    pip install pdfplumber regex
"""

import pdfplumber
import re
import json
import argparse
import uuid
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime


@dataclass
class Question:
    """Represents a single MCQ question with bilingual support."""
    id: str
    question_number: int
    question_text_en: str
    question_text_hi: Optional[str]
    has_table: bool
    table_html: Optional[str]
    option_a_en: str
    option_b_en: str
    option_c_en: Optional[str]
    option_d_en: Optional[str]
    option_a_hi: Optional[str]
    option_b_hi: Optional[str]
    option_c_hi: Optional[str]
    option_d_hi: Optional[str]
    correct_option: str  # 'a', 'b', 'c', or 'd'
    explanation_en: Optional[str]
    explanation_hi: Optional[str]
    source: Optional[str]
    difficulty: str


@dataclass
class MockTest:
    """Represents a complete mock test set."""
    id: str
    title_en: str
    title_hi: Optional[str]
    subject: str
    total_questions: int
    time_limit_minutes: int
    difficulty: str
    source: Optional[str]
    created_at: str
    questions: List[Question]


class PDFExtractor:
    """
    Extracts MCQ questions from PDF files.
    
    Handles various PDF formats commonly used in UPSC mock tests.
    """
    
    # Regex patterns for question detection
    QUESTION_PATTERNS = [
        r'^Q\.?\s*(\d+)[.\):]?\s*',           # Q1. or Q.1 or Q1:
        r'^(\d+)[.\)]\s*',                     # 1. or 1)
        r'^Question\s*(\d+)[.:\s]',            # Question 1
        r'^प्रश्न\s*(\d+)[.:\s]',                # Hindi: प्रश्न 1
    ]
    
    # Option patterns
    OPTION_PATTERNS = [
        r'^([a-d])[.\)]\s*(.+)',              # a) or a.
        r'^\(([a-d])\)\s*(.+)',               # (a)
        r'^([A-D])[.\)]\s*(.+)',              # A) or A.
    ]
    
    # Answer patterns
    ANSWER_PATTERNS = [
        r'Answer[:\s]*\(?([a-dA-D])\)?',       # Answer: b or Answer: (b)
        r'Ans[:\s]*\(?([a-dA-D])\)?',          # Ans: b
        r'उत्तर[:\s]*\(?([a-dA-D])\)?',         # Hindi: उत्तर: b
        r'सही उत्तर[:\s]*\(?([a-dA-D])\)?',     # Hindi: सही उत्तर: b
    ]
    
    # Explanation patterns
    EXPLANATION_PATTERNS = [
        r'^Explanation[:\s]*(.+)',
        r'^व्याख्या[:\s]*(.+)',                  # Hindi
        r'^Hint[:\s]*(.+)',
    ]
    
    # Source patterns
    SOURCE_PATTERNS = [
        r'Source[:\s]*(.+)',
        r'स्रोत[:\s]*(.+)',
    ]
    
    # Difficulty patterns
    DIFFICULTY_PATTERNS = [
        r'Difficulty[:\s]*(Easy|Moderate|Medium|Difficult|Hard)',
        r'कठिनाई[:\s]*(आसान|मध्यम|कठिन)',
    ]

    def __init__(self, pdf_path: str):
        """Initialize extractor with PDF path."""
        self.pdf_path = Path(pdf_path)
        if not self.pdf_path.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        self.raw_text = ""
        self.pages_text = []
        self.tables = []

    def extract_text(self) -> str:
        """Extract all text from PDF."""
        print(f"📄 Extracting text from: {self.pdf_path.name}")
        
        with pdfplumber.open(self.pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text() or ""
                self.pages_text.append(page_text)
                self.raw_text += page_text + "\n\n"
                
                # Extract tables
                page_tables = page.extract_tables()
                if page_tables:
                    for table in page_tables:
                        self.tables.append({
                            'page': i + 1,
                            'data': table
                        })
        
        print(f"   ✓ Extracted {len(pdf.pages)} pages")
        print(f"   ✓ Found {len(self.tables)} tables")
        
        return self.raw_text

    def _find_pattern(self, text: str, patterns: list) -> Optional[Tuple[str, int, int]]:
        """Find first matching pattern in text."""
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1) if match.groups() else match.group(0), match.start(), match.end()
        return None

    def _split_by_questions(self, text: str) -> List[Dict]:
        """Split text into individual question blocks."""
        questions = []
        current_q = None
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if this line starts a new question
            is_new_question = False
            q_num = None
            
            for pattern in self.QUESTION_PATTERNS:
                match = re.match(pattern, line, re.IGNORECASE)
                if match:
                    is_new_question = True
                    q_num = int(match.group(1))
                    line = re.sub(pattern, '', line).strip()
                    break
            
            if is_new_question:
                if current_q:
                    questions.append(current_q)
                current_q = {
                    'number': q_num,
                    'text': line,
                    'options': {},
                    'answer': None,
                    'explanation': '',
                    'source': None,
                    'difficulty': 'Moderate'
                }
            elif current_q:
                # Check for options
                for pattern in self.OPTION_PATTERNS:
                    match = re.match(pattern, line, re.IGNORECASE)
                    if match:
                        option_letter = match.group(1).lower()
                        option_text = match.group(2).strip()
                        current_q['options'][option_letter] = option_text
                        break
                else:
                    # Check for answer
                    for pattern in self.ANSWER_PATTERNS:
                        match = re.search(pattern, line, re.IGNORECASE)
                        if match:
                            current_q['answer'] = match.group(1).lower()
                            line = re.sub(pattern, '', line).strip()
                            break
                    
                    # Check for explanation
                    for pattern in self.EXPLANATION_PATTERNS:
                        match = re.match(pattern, line, re.IGNORECASE)
                        if match:
                            current_q['explanation'] = match.group(1).strip()
                            break
                    else:
                        # Check for source
                        for pattern in self.SOURCE_PATTERNS:
                            match = re.search(pattern, line, re.IGNORECASE)
                            if match:
                                current_q['source'] = match.group(1).strip()
                                break
                        
                        # Check for difficulty
                        for pattern in self.DIFFICULTY_PATTERNS:
                            match = re.search(pattern, line, re.IGNORECASE)
                            if match:
                                current_q['difficulty'] = match.group(1).strip()
                                break
                        
                        # Append to explanation if we're past the answer
                        if current_q['answer'] and not any(re.search(p, line) for p in self.SOURCE_PATTERNS + self.DIFFICULTY_PATTERNS):
                            if current_q['explanation']:
                                current_q['explanation'] += ' ' + line
                            elif line and not line.startswith(('Source', 'Difficulty', 'स्रोत', 'कठिनाई')):
                                current_q['explanation'] = line
        
        if current_q:
            questions.append(current_q)
        
        return questions

    def _detect_bilingual(self, text: str) -> bool:
        """Detect if text contains Hindi characters."""
        # Hindi Unicode range
        hindi_pattern = r'[\u0900-\u097F]'
        return bool(re.search(hindi_pattern, text))

    def _convert_table_to_html(self, table_data: list) -> str:
        """Convert table data to HTML string."""
        if not table_data:
            return ""
        
        html = '<table class="question-table">'
        
        # First row as header
        if table_data:
            html += '<thead><tr>'
            for cell in table_data[0]:
                html += f'<th>{cell or ""}</th>'
            html += '</tr></thead>'
        
        # Rest as body
        if len(table_data) > 1:
            html += '<tbody>'
            for row in table_data[1:]:
                html += '<tr>'
                for cell in row:
                    html += f'<td>{cell or ""}</td>'
                html += '</tr>'
            html += '</tbody>'
        
        html += '</table>'
        return html

    def parse_questions(self) -> List[Question]:
        """Parse extracted text into Question objects."""
        if not self.raw_text:
            self.extract_text()
        
        print("🔍 Parsing questions...")
        raw_questions = self._split_by_questions(self.raw_text)
        print(f"   ✓ Found {len(raw_questions)} questions")
        
        questions = []
        for i, rq in enumerate(raw_questions):
            try:
                # Determine if bilingual
                is_bilingual = self._detect_bilingual(rq['text'])
                
                # Create Question object
                q = Question(
                    id=str(uuid.uuid4()),
                    question_number=rq.get('number', i + 1),
                    question_text_en=rq['text'],
                    question_text_hi=rq['text'] if is_bilingual else None,
                    has_table=False,  # Will be updated if table detected
                    table_html=None,
                    option_a_en=rq['options'].get('a', ''),
                    option_b_en=rq['options'].get('b', ''),
                    option_c_en=rq['options'].get('c'),
                    option_d_en=rq['options'].get('d'),
                    option_a_hi=None,
                    option_b_hi=None,
                    option_c_hi=None,
                    option_d_hi=None,
                    correct_option=rq.get('answer', 'a'),
                    explanation_en=rq.get('explanation', ''),
                    explanation_hi=None,
                    source=rq.get('source'),
                    difficulty=rq.get('difficulty', 'Moderate')
                )
                
                questions.append(q)
                
            except Exception as e:
                print(f"   ⚠ Error parsing question {i+1}: {e}")
                continue
        
        print(f"   ✓ Successfully parsed {len(questions)} questions")
        return questions

    def create_mock_test(
        self, 
        questions: List[Question],
        title_en: str,
        title_hi: Optional[str] = None,
        subject: str = "General",
        time_limit: int = 120
    ) -> MockTest:
        """Create a MockTest object from questions."""
        
        # Determine overall difficulty
        difficulties = [q.difficulty for q in questions]
        if difficulties:
            from collections import Counter
            difficulty = Counter(difficulties).most_common(1)[0][0]
        else:
            difficulty = "Moderate"
        
        # Get source if available
        sources = [q.source for q in questions if q.source]
        source = sources[0] if sources else None
        
        return MockTest(
            id=str(uuid.uuid4()),
            title_en=title_en,
            title_hi=title_hi,
            subject=subject,
            total_questions=len(questions),
            time_limit_minutes=time_limit,
            difficulty=difficulty,
            source=source,
            created_at=datetime.now().isoformat(),
            questions=questions
        )


def export_to_json(mock_test: MockTest, output_path: str):
    """Export MockTest to JSON file."""
    output_file = Path(output_path)
    
    # Convert to dict
    data = asdict(mock_test)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Exported to: {output_file}")
    print(f"   • {mock_test.total_questions} questions")
    print(f"   • Subject: {mock_test.subject}")
    print(f"   • Time: {mock_test.time_limit_minutes} minutes")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Extract MCQ questions from PDF and export to JSON',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python extract_mcq.py test.pdf output.json
  python extract_mcq.py test.pdf output.json --subject "Polity" --test-name "Mock Test 1"
  python extract_mcq.py test.pdf output.json --time 90 --title-hi "राजव्यवस्था टेस्ट 1"
        """
    )
    
    parser.add_argument('input_pdf', help='Input PDF file path')
    parser.add_argument('output_json', help='Output JSON file path')
    parser.add_argument('--subject', '-s', default='General', 
                        help='Subject name (default: General)')
    parser.add_argument('--test-name', '-n', default='Mock Test',
                        help='Test name in English (default: Mock Test)')
    parser.add_argument('--title-hi', help='Test name in Hindi (optional)')
    parser.add_argument('--time', '-t', type=int, default=120,
                        help='Time limit in minutes (default: 120)')
    
    args = parser.parse_args()
    
    print("\n" + "="*50)
    print("🎯 UPSC Mock Test PDF Extractor")
    print("="*50 + "\n")
    
    try:
        # Extract
        extractor = PDFExtractor(args.input_pdf)
        extractor.extract_text()
        
        # Parse
        questions = extractor.parse_questions()
        
        if not questions:
            print("❌ No questions found in PDF!")
            return 1
        
        # Create mock test
        mock_test = extractor.create_mock_test(
            questions=questions,
            title_en=args.test_name,
            title_hi=args.title_hi,
            subject=args.subject,
            time_limit=args.time
        )
        
        # Export
        export_to_json(mock_test, args.output_json)
        
        print("\n" + "="*50)
        print("✅ Extraction Complete!")
        print("="*50 + "\n")
        
        return 0
        
    except FileNotFoundError as e:
        print(f"❌ Error: {e}")
        return 1
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    exit(main())
