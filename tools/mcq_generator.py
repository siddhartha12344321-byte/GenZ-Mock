"""
MCQ Generator from Current Affairs
===================================
Takes current affairs articles and generates UPSC-style MCQs.
Uses AI to create quality questions when available, falls back to rule-based generation.
"""

import json
import re
import os
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
import random


@dataclass
class MCQuestion:
    """Represents a generated MCQ"""
    id: str
    question: str
    options: List[str]
    correct_answer: int  # 0-indexed
    explanation: str
    source_article_id: str
    source_article_title: str
    category: str
    difficulty: str  # 'easy', 'medium', 'hard'


class MCQGenerator:
    """Generates MCQs from current affairs articles"""
    
    # Template-based question patterns
    QUESTION_TEMPLATES = {
        'Polity & Governance': [
            "Which of the following statements regarding {topic} is/are correct?",
            "Consider the following statements about {topic}:\n1. {stmt1}\n2. {stmt2}\nWhich of the above is/are correct?",
            "With reference to {topic}, consider the following:\nWhich of the above statement(s) is/are true?"
        ],
        'Economy': [
            "Which of the following is true about {topic}?",
            "Consider the following regarding {topic}:\nSelect the correct statement(s).",
            "The {topic} is related to which of the following?"
        ],
        'International Relations': [
            "{topic} is related to which country/organization?",
            "The recent {topic} involves which of the following countries?",
            "Which international body is associated with {topic}?"
        ],
        'Environment & Ecology': [
            "Which of the following is true about {topic}?",
            "The {topic} is found in which of the following regions?",
            "Consider the conservation status of {topic}. Which statement is correct?"
        ],
        'Science & Technology': [
            "The {topic} technology is developed by which organization?",
            "Which of the following statements about {topic} is correct?",
            "The {topic} mission/project is related to:"
        ]
    }
    
    # Common UPSC-style distractors
    GENERIC_DISTRACTORS = {
        'Polity & Governance': [
            "It requires a Constitutional Amendment",
            "It is mentioned in the Directive Principles",
            "It falls under the State List",
            "It requires ratification by states",
            "It is a quasi-judicial body"
        ],
        'Economy': [
            "It is regulated by RBI",
            "It comes under SEBI jurisdiction",
            "It is a centrally sponsored scheme",
            "It aims to achieve 5 trillion dollar economy",
            "It is part of Atmanirbhar Bharat"
        ],
        'International Relations': [
            "It is a UN initiative",
            "India is a founding member",
            "It is headquartered in Geneva",
            "It was established in 2023",
            "China is not a member"
        ]
    }
    
    def __init__(self, output_dir: str = '../data'):
        self.output_dir = output_dir
    
    def generate_from_article(self, article: Dict) -> List[MCQuestion]:
        """Generate MCQs from a single article"""
        questions = []
        
        title = article.get('title', '')
        summary = article.get('summary', '')
        highlights = article.get('highlights', [])
        category = article.get('category', 'Current Events')
        
        # Combine all text
        full_text = f"{title} {summary} {' '.join(highlights)}"
        
        # Extract key entities and facts
        entities = self._extract_entities(full_text)
        facts = self._extract_facts(full_text, highlights)
        
        # Generate questions based on extracted info
        if facts:
            for i, fact in enumerate(facts[:3]):  # Max 3 questions per article
                q = self._create_question(
                    fact=fact,
                    category=category,
                    article=article,
                    question_num=i
                )
                if q:
                    questions.append(q)
        
        return questions
    
    def _extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract named entities from text"""
        entities = {
            'organizations': [],
            'countries': [],
            'numbers': [],
            'schemes': []
        }
        
        # Simple regex-based extraction
        # Organizations (capitalized multi-word)
        org_pattern = r'\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)\b'
        entities['organizations'] = list(set(re.findall(org_pattern, text)))[:5]
        
        # Numbers with context
        num_pattern = r'(\d+(?:\.\d+)?(?:\s*(?:%|crore|lakh|million|billion|trillion)))'
        entities['numbers'] = list(set(re.findall(num_pattern, text, re.I)))[:3]
        
        # Common countries
        countries = ['India', 'China', 'USA', 'Japan', 'Russia', 'UK', 'France', 
                    'Germany', 'Australia', 'Pakistan', 'Bangladesh', 'Nepal']
        for country in countries:
            if country.lower() in text.lower():
                entities['countries'].append(country)
        
        return entities
    
    def _extract_facts(self, text: str, highlights: List[str]) -> List[Dict]:
        """Extract factual statements that can be turned into questions"""
        facts = []
        
        # Use highlights directly as they contain key facts
        for highlight in highlights:
            if len(highlight) > 50:
                facts.append({
                    'statement': highlight,
                    'type': 'highlight'
                })
        
        # Extract numerical facts from text
        num_facts = re.findall(r'([^.]*\d+(?:\.\d+)?(?:\s*(?:%|crore|lakh))[^.]*\.)', text)
        for fact in num_facts[:2]:
            facts.append({
                'statement': fact.strip(),
                'type': 'numerical'
            })
        
        return facts[:5]  # Limit to 5 facts
    
    def _create_question(self, fact: Dict, category: str, article: Dict, question_num: int) -> Optional[MCQuestion]:
        """Create a single MCQ from a fact"""
        statement = fact['statement']
        
        # Create question text
        topic = self._extract_topic(article['title'])
        
        # Select template
        templates = self.QUESTION_TEMPLATES.get(category, self.QUESTION_TEMPLATES['Polity & Governance'])
        template = random.choice(templates)
        
        question_text = template.format(topic=topic, stmt1=statement[:100], stmt2="")
        
        # Create options
        correct_option = self._create_correct_option(statement)
        distractors = self._create_distractors(statement, category)
        
        options = [correct_option] + distractors[:3]
        random.shuffle(options)
        correct_index = options.index(correct_option)
        
        # Create explanation
        explanation = f"According to the article '{article['title']}': {statement[:200]}"
        
        return MCQuestion(
            id=f"{article['id']}_q{question_num}",
            question=question_text,
            options=options,
            correct_answer=correct_index,
            explanation=explanation,
            source_article_id=article['id'],
            source_article_title=article['title'],
            category=category,
            difficulty='medium'
        )
    
    def _extract_topic(self, title: str) -> str:
        """Extract main topic from title"""
        # Remove common words
        stopwords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'in', 'on', 'for', 'to']
        words = title.split()
        topic_words = [w for w in words if w.lower() not in stopwords][:5]
        return ' '.join(topic_words)
    
    def _create_correct_option(self, statement: str) -> str:
        """Create correct answer option from statement"""
        # Shorten and clean the statement
        option = statement[:150]
        if len(statement) > 150:
            option = option.rsplit(' ', 1)[0] + '...'
        return option
    
    def _create_distractors(self, correct_statement: str, category: str) -> List[str]:
        """Create plausible but incorrect options"""
        distractors = []
        
        # Get category-specific distractors
        category_distractors = self.GENERIC_DISTRACTORS.get(
            category, 
            self.GENERIC_DISTRACTORS['Polity & Governance']
        )
        
        # Generate related but wrong statements
        # 1. Negate the statement
        negated = self._negate_statement(correct_statement)
        if negated:
            distractors.append(negated)
        
        # 2. Add random category distractors
        distractors.extend(random.sample(category_distractors, min(3, len(category_distractors))))
        
        return distractors[:3]
    
    def _negate_statement(self, statement: str) -> Optional[str]:
        """Create a negated version of the statement"""
        negations = {
            'is': 'is not',
            'are': 'are not',
            'has': 'does not have',
            'have': 'do not have',
            'will': 'will not',
            'can': 'cannot'
        }
        
        for word, negated in negations.items():
            if f' {word} ' in statement.lower():
                return re.sub(f' {word} ', f' {negated} ', statement, count=1, flags=re.I)[:150]
        
        return None
    
    def generate_from_file(self, json_file: str) -> List[MCQuestion]:
        """Generate MCQs from a JSON file of articles"""
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        all_questions = []
        
        for article in data.get('articles', []):
            questions = self.generate_from_article(article)
            all_questions.extend(questions)
        
        print(f"✅ Generated {len(all_questions)} MCQs from {len(data.get('articles', []))} articles")
        return all_questions
    
    def save_mcqs(self, questions: List[MCQuestion], filename: str = None):
        """Save MCQs to JSON file"""
        if filename is None:
            filename = f"mcqs_{datetime.now().strftime('%Y%m%d')}.json"
        
        os.makedirs(self.output_dir, exist_ok=True)
        filepath = os.path.join(self.output_dir, filename)
        
        data = {
            'generated_at': datetime.now().isoformat(),
            'total_questions': len(questions),
            'questions': [asdict(q) for q in questions]
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Saved MCQs to: {filepath}")
        return filepath


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate MCQs from Current Affairs')
    parser.add_argument('--input', help='Input JSON file with articles')
    parser.add_argument('--output', default='../data', help='Output directory')
    
    args = parser.parse_args()
    
    generator = MCQGenerator(output_dir=args.output)
    
    if args.input and os.path.exists(args.input):
        questions = generator.generate_from_file(args.input)
    else:
        # Find latest articles file
        data_dir = args.output
        files = [f for f in os.listdir(data_dir) if f.startswith('current_affairs_') and f.endswith('.json')]
        if files:
            latest = sorted(files)[-1]
            questions = generator.generate_from_file(os.path.join(data_dir, latest))
        else:
            print("❌ No articles file found. Run current_affairs_scraper.py first.")
            return
    
    if questions:
        generator.save_mcqs(questions)
        
        # Print sample
        print("\n📝 Sample MCQ:")
        q = questions[0]
        print(f"\nQ: {q.question}")
        for i, opt in enumerate(q.options):
            marker = "✓" if i == q.correct_answer else " "
            print(f"  {marker} {chr(65+i)}. {opt}")
        print(f"\nExplanation: {q.explanation}")


if __name__ == '__main__':
    main()
