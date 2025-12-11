/**
 * Admin Data Manager for Gen-Z Mocks
 * ===================================
 * Handles all data operations with localStorage fallback
 * When Supabase tables are ready, it will use Supabase
 */

class AdminDataManager {
    constructor() {
        this.storagePrefix = 'genz_';
        this.mockTests = this.load('mock_tests') || [];
        this.questions = this.load('questions') || [];
        this.accessKeys = this.load('access_keys') || [];
        this.subjects = this.getDefaultSubjects();

        // Add default testing keys if not already present
        this.initDefaultKeys();

        // Add demo test if no tests exist
        this.initDemoTest();

        console.log('📦 AdminDataManager initialized');
        console.log(`   - ${this.mockTests.length} tests`);
        console.log(`   - ${this.questions.length} questions`);
        console.log(`   - ${this.accessKeys.length} access keys`);
    }

    initDefaultKeys() {
        const defaultKeys = ['GenZTesting1', 'GenZTesting2', 'GenZTesting3', 'GenZTesting4', 'GenZTesting5'];
        let validKeys = JSON.parse(localStorage.getItem('valid_keys') || '[]');

        let added = false;
        defaultKeys.forEach(key => {
            if (!validKeys.includes(key)) {
                validKeys.push(key);
                added = true;
            }
        });

        if (added) {
            localStorage.setItem('valid_keys', JSON.stringify(validKeys));
            console.log('🔑 Default testing keys added:', defaultKeys);
        }
    }

    initDemoTest() {
        // Only add if no tests exist
        if (this.mockTests.length > 0) return;

        const demoTest = {
            id: 'polity_daily_2',
            name_en: 'Polity Daily Test - 2',
            name_hi: 'राजव्यवस्था दैनिक टेस्ट - 2',
            subject: 'polity',
            time_limit: 30,
            total_questions: 25,
            negative_marking: true,
            is_active: true,
            created_at: new Date().toISOString()
        };

        const demoQuestions = [
            { id: 'q1', test_id: 'polity_daily_2', question_en: "Match the following pairs:\n\nList I\nA. Dhar Commission\nB. JVP Committee\nC. Fazl Ali Commission\n\nList II\n1. Recommended linguistic reorganization of states.\n2. Rejected language as the basis for reorganization.\n3. Report was the basis of States Reorganization Act, 1956.\n\nHow many pairs given above are correctly matched?", options: ["Only one", "Only two", "All three", "None"], correct_option: 1, explanation: "Pair A is incorrect: Dhar Commission recommended reorganization based on administrative convenience. Pair B is correct: JVP Committee rejected language as basis. Pair C is correct: Fazl Ali Commission formed basis of States Reorganization Act, 1956." },
            { id: 'q2', test_id: 'polity_daily_2', question_en: "With reference to States Reorganization in India, arrange the following States in chronological order of their formation:\n\nI. Sikkim\nII. Himachal Pradesh\nIII. Manipur\nIV. Mizoram\n\nSelect the correct answer:", options: ["I-III-IV-II", "III-I-IV-II", "II-III-I-IV", "IV-III-II-I"], correct_option: 2, explanation: "Correct chronological order: Himachal Pradesh (II), Manipur (III), Sikkim (I), Mizoram (IV) — hence II-III-I-IV." },
            { id: 'q3', test_id: 'polity_daily_2', question_en: "With reference to Union Territories in India, consider the following statements:\n\nI. The President of India appoints an administrator for each union territory.\nII. Parliament has authority to make laws for union territories on any subject in three lists.\nIII. All union territories have a high court located within.\nIV. Ministry of Home Affairs oversees matters related to union territories.\n\nWhich statements are correct?", options: ["I and IV only", "I, II and IV only", "II and III only", "I, II, III and IV"], correct_option: 1, explanation: "President appoints administrators (Article 239). Parliament can legislate for UTs on all lists. Not all UTs have High Court within them. MHA oversees UT matters." },
            { id: 'q4', test_id: 'polity_daily_2', question_en: "Consider the following statements:\n\nI. Article 2 empowers Parliament to admit or establish new states.\nII. Article 3 deals with alteration of boundaries of existing states.\nIII. Articles 2 and 3 require constitutional amendment by Article 368.\n\nWhich statements are correct?", options: ["Only I and II", "Only II and III", "Only I and III", "I, II and III"], correct_option: 0, explanation: "Articles 2 and 3 give Parliament power regarding admission/formation and alteration of states; creation/alteration is effected by ordinary legislation, not always constitutional amendment." },
            { id: 'q5', test_id: 'polity_daily_2', question_en: "Consider the following statements regarding 'basic structure' doctrine:\n\nI. It does not apply to a law placed under Ninth Schedule.\nII. India is the only legal system accepting 'basic structure' doctrine.\n\nWhich is/are correct?", options: ["Only I", "Only II", "Both I and II", "Neither I nor II"], correct_option: 3, explanation: "Both incorrect. Basic structure doctrine can apply to Ninth Schedule laws. While India developed the doctrine, other jurisdictions have analogous controls." },
            { id: 'q6', test_id: 'polity_daily_2', question_en: "Which are grounds for acquiring citizenship in India per Citizenship Act 1955?\n\nI. Birth\nII. Naturalisation\nIII. Registration\nIV. Marriage\nV. Descent\n\nSelect the correct answer:", options: ["II, III, and IV only", "I, III, IV and V only", "I, II, III and V only", "I, II, III, IV and V"], correct_option: 2, explanation: "Citizenship Act recognizes Birth, Descent, Registration and Naturalization. Marriage is not an independent ground." },
            { id: 'q7', test_id: 'polity_daily_2', question_en: "Which statements about citizenship provisions in Constitution are correct?\n\n1. Article 5 provided citizenship to persons domiciled in India at commencement.\n2. Article 6 provided citizenship to persons who migrated from Pakistan before July 19, 1948.\n3. Article 7 provided that persons who migrated to Pakistan but returned were automatically citizens.\n\nSelect the answer:", options: ["1 only", "1 and 2 only", "2 and 3 only", "1, 2 and 3"], correct_option: 1, explanation: "Statements 1 and 2 correct. Statement 3 incorrect: Migrants to Pakistan who returned had to register, not automatic citizenship." },
            { id: 'q8', test_id: 'polity_daily_2', question_en: "About OCI Cardholders, which statement is INCORRECT?\n\nI. Registration can be cancelled for showing disaffection towards Constitution.\nII. OCI Cardholder is eligible to vote in Indian elections.\nIII. OCI Cardholders are eligible for teaching faculty in IITs and Central Universities.", options: ["I and II only", "II only", "I and III only", "I, II and III"], correct_option: 1, explanation: "Statement II is incorrect: OCI holders cannot vote. Statement I is correct (registration can be cancelled). Statement III is correct." },
            { id: 'q9', test_id: 'polity_daily_2', question_en: "Consider regarding citizenship:\n\nI. Person voluntarily acquiring foreign citizenship ceases to be Indian citizen.\nII. Both citizens by birth and naturalized citizens are eligible for President.\nIII. Overseas Indians became citizens after 1950 without registration.\n\nHow many are correct?", options: ["Only one", "Only two", "All three", "None"], correct_option: 0, explanation: "Only Statement I correct. Statement II incorrect: naturalized citizens not eligible for President. Statement III incorrect: registration required." },
            { id: 'q10', test_id: 'polity_daily_2', question_en: "Which correctly differentiates citizens from aliens?\n\na) Citizens enjoy political rights including voting; aliens do not.\nb) Aliens enjoy all Part III rights without exceptions.\nc) Both citizens and aliens are equally eligible for public employment.\n\nSelect correct option:", options: ["a only", "b only", "c only", "a and c"], correct_option: 0, explanation: "Citizens enjoy political rights; aliens do not. Many fundamental rights apply to all but political rights reserved for citizens." },
            { id: 'q11', test_id: 'polity_daily_2', question_en: "Grounds for termination of Indian citizenship:\n\nI. Citizenship obtained by fraud.\nII. Shown disloyalty to Constitution.\nIII. Unlawful communication with enemy during war.\n\nHow many are correct?", options: ["Only one", "Only two", "All three", "None"], correct_option: 2, explanation: "All three are valid grounds for termination: fraud, disloyalty, unlawful communication with enemy." },
            { id: 'q12', test_id: 'polity_daily_2', question_en: "About naturalization in India:\n\nI. President has power to grant naturalization certificate.\nII. Any person can acquire citizenship if ordinarily resident for 6 years.\n\nWhich correct?", options: ["I only", "II only", "Both I and II", "Neither I nor II"], correct_option: 2, explanation: "President has power to grant naturalization certificate. Naturalization rules require specified residence period." },
            { id: 'q13', test_id: 'polity_daily_2', question_en: "About classification of Indian territory:\n\nStatement I: Classification implies uniform application of provisions across all states.\nStatement II: Special provisions for certain states highlight Constitution's flexibility.\n\nWhich is correct?", options: ["Both correct and II explains I", "Both correct but II doesn't explain I", "I correct, II incorrect", "I incorrect, II correct"], correct_option: 3, explanation: "Statement I incorrect — special provisions exist. Statement II correct: Constitution provides flexibility." },
            { id: 'q14', test_id: 'polity_daily_2', question_en: "Creating new Union Territories involves which actions?\n\nI. Constitutional amendment.\nII. Mandatory approval from state legislatures.\nIII. Legislation by Parliament.\nIV. Ratification by existing UTs.\n\nHow many are required?", options: ["Only two", "Only three", "All four", "None"], correct_option: 0, explanation: "Only two: Constitutional changes and Parliamentary legislation. State legislature approval not mandatory (views not binding)." },
            { id: 'q15', test_id: 'polity_daily_2', question_en: "At Constitution's commencement, which became citizens automatically?\n\nI. Persons domiciled in India meeting criteria.\nII. Migrants from Pakistan before 19 July 1948 ordinarily resident thereafter.\n\nSelect correct option:", options: ["Only I", "Only II", "I and II", "Neither"], correct_option: 2, explanation: "Both categories became citizens: Article 5 (domiciled) and Article 6 (migrants from Pakistan before July 1948)." },
            { id: 'q16', test_id: 'polity_daily_2', question_en: "India's citizenship provisions:\n\nI. Citizens owe allegiance only to Union, not individual states.\nII. Constitution deals with acquisition/loss of citizenship after commencement.\n\nWhich correct?", options: ["I only", "II only", "Both I and II", "Neither"], correct_option: 2, explanation: "Both correct: Single citizenship means allegiance to Union. Part II addresses citizenship after commencement." },
            { id: 'q17', test_id: 'polity_daily_2', question_en: "About inclusion of territory into India:\n\nI. Entire population automatically becomes citizens.\nII. Population may retain previous country's citizenship in some situations.\n\nWhich correct?", options: ["Only I", "Only II", "Both I and II", "Neither"], correct_option: 1, explanation: "Statement I not universally correct. Statement II can be true in certain dual citizenship scenarios." },
            { id: 'q18', test_id: 'polity_daily_2', question_en: "About creating new states (Articles 2 and 3):\n\nI. Article 2 empowers Parliament to admit/establish new states.\nII. Article 3 deals with alteration of boundaries.\nIII. Both require Article 368 amendment.\n\nWhich correct?", options: ["I and II only", "II and III only", "I and III only", "I, II and III"], correct_option: 0, explanation: "Article 2 admits new states, Article 3 alters boundaries; enacted through legislation, not always Article 368 amendment." },
            { id: 'q19', test_id: 'polity_daily_2', question_en: "About basic structure doctrine:\n\nI. Doctrine prevents amendments destroying essential features.\nII. Judiciary defines doctrine progressively through cases.\n\nWhich is INCORRECT?", options: ["Only I", "Only II", "Both I and II", "Neither I nor II"], correct_option: 3, explanation: "Both statements accurate. Doctrine limits amendments destroying essential features; judiciary has refined it through cases." },
            { id: 'q20', test_id: 'polity_daily_2', question_en: "In which situation will termination of citizenship NOT occur?\n\na) During elections\nb) National emergency\nc) War India is engaged\nd) National holiday", options: ["During elections", "National emergency", "War India is engaged", "A national holiday"], correct_option: 3, explanation: "Termination governed by statutory grounds (fraud, disloyalty, etc.). Not linked to national holidays." },
            { id: 'q21', test_id: 'polity_daily_2', question_en: "Constitution's flexibility in addressing diversity:\n\nStatement I: Classification into states/UTs implies uniform application.\nStatement II: Special provisions highlight flexibility.\n\nWhich is correct?", options: ["Both correct, II explains I", "Both correct, II doesn't explain I", "I correct, II incorrect", "I incorrect, II correct"], correct_option: 3, explanation: "Statement I incorrect (special provisions exist). Statement II correct (shows flexibility)." },
            { id: 'q22', test_id: 'polity_daily_2', question_en: "At Constitution's commencement, which became citizens?\n\nI. Persons domiciled meeting criteria.\nII. Migrants from Pakistan before 19 July 1948 ordinarily resident.\n\nSelect correct option:", options: ["Only I", "Only II", "Both I and II", "Neither"], correct_option: 2, explanation: "Both categories (Article 5 and Article 6) became citizens at commencement." },
            { id: 'q23', test_id: 'polity_daily_2', question_en: "About Union Territories and administrators:\n\nI. President appoints administrator.\nII. Parliament can legislate on all three lists.\nIII. All UTs have High Court within.\nIV. MHA oversees UT matters.\n\nWhich correct?", options: ["I and IV only", "I, II and IV only", "II and III only", "I, II, III and IV"], correct_option: 1, explanation: "I, II, IV correct. III incorrect: Not all UTs have High Court within them." },
            { id: 'q24', test_id: 'polity_daily_2', question_en: "Parliament's role when creating new state/UT or altering boundaries?", options: ["Must obtain binding approval from state legislatures", "Enacts legislation and may seek state views (not binding)", "Cannot act without Article 368 amendment", "Needs ratification from all existing UTs"], correct_option: 1, explanation: "Parliament enacts legislation under Articles 2/3; may seek state views but they are not binding." },
            { id: 'q25', test_id: 'polity_daily_2', question_en: "About Article 1 and territory:\n\nSelect the correct statement:", options: ["Article 1 defines territory; changes may require amendment or legislation", "Article 1 only deals with citizenship not territory", "Article 1 prohibits changes without unanimous state approval", "Article 1 doesn't concern states or UTs"], correct_option: 0, explanation: "Article 1 defines territory including states and UTs; changes governed by constitutional provisions and parliamentary action." }
        ];

        this.mockTests = [demoTest];
        this.questions = demoQuestions;
        this.save('mock_tests', this.mockTests);
        this.save('questions', this.questions);
        console.log('📝 Demo test "Polity Daily Test - 2" with 25 questions added!');
    }

    // ===== STORAGE HELPERS =====

    load(key) {
        try {
            return JSON.parse(localStorage.getItem(this.storagePrefix + key));
        } catch {
            return null;
        }
    }

    save(key, data) {
        localStorage.setItem(this.storagePrefix + key, JSON.stringify(data));
    }

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ===== SUBJECTS =====

    getDefaultSubjects() {
        return [
            { id: 'polity', name_en: 'Indian Polity', name_hi: 'भारतीय राजव्यवस्था', icon: '⚖️' },
            { id: 'history', name_en: 'History', name_hi: 'इतिहास', icon: '📜' },
            { id: 'geography', name_en: 'Geography', name_hi: 'भूगोल', icon: '🌍' },
            { id: 'economy', name_en: 'Economy', name_hi: 'अर्थव्यवस्था', icon: '📊' },
            { id: 'environment', name_en: 'Environment', name_hi: 'पर्यावरण', icon: '🌱' },
            { id: 'science', name_en: 'Science & Technology', name_hi: 'विज्ञान एवं प्रौद्योगिकी', icon: '🔬' },
            { id: 'current', name_en: 'Current Affairs', name_hi: 'समसामयिकी', icon: '📰' },
            { id: 'culture', name_en: 'Art & Culture', name_hi: 'कला एवं संस्कृति', icon: '🎨' }
        ];
    }

    getSubjectByValue(value) {
        return this.subjects.find(s => s.id === value || s.name_en.toLowerCase().includes(value.toLowerCase()));
    }

    // ===== MOCK TESTS =====

    getAllTests() {
        return this.mockTests;
    }

    getTestById(id) {
        return this.mockTests.find(t => t.id === id);
    }

    createTest(testData) {
        const test = {
            id: this.generateId(),
            name_en: testData.name_en,
            name_hi: testData.name_hi || '',
            subject_id: testData.subject,
            difficulty: testData.difficulty || 'moderate',
            total_questions: testData.questions || 0,
            time_limit: testData.time || 120,
            mark_correct: testData.mark_correct || 2,
            mark_wrong: testData.mark_wrong || 0.66,
            source: testData.source || '',
            description: testData.description || '',
            is_active: true,
            created_at: new Date().toISOString(),
            attempts: 0
        };

        this.mockTests.unshift(test);
        this.save('mock_tests', this.mockTests);
        console.log('✅ Test created:', test.name_en);
        return test;
    }

    updateTest(id, updates) {
        const index = this.mockTests.findIndex(t => t.id === id);
        if (index !== -1) {
            this.mockTests[index] = { ...this.mockTests[index], ...updates };
            this.save('mock_tests', this.mockTests);
            return true;
        }
        return false;
    }

    deleteTest(id) {
        const index = this.mockTests.findIndex(t => t.id === id);
        if (index !== -1) {
            this.mockTests.splice(index, 1);
            this.save('mock_tests', this.mockTests);
            // Also delete associated questions
            this.questions = this.questions.filter(q => q.test_id !== id);
            this.save('questions', this.questions);
            return true;
        }
        return false;
    }

    // ===== QUESTIONS =====

    getAllQuestions() {
        return this.questions;
    }

    getQuestionsByTestId(testId) {
        return this.questions.filter(q => q.test_id === testId);
    }

    addQuestionsToTest(testId, questionsData) {
        const newQuestions = questionsData.map((q, i) => ({
            id: this.generateId(),
            test_id: testId,
            question_number: q.question_number || i + 1,
            question_text_en: q.question_text_en || q.question_text || q.question || '',
            question_text_hi: q.question_text_hi || '',
            option_a_en: q.option_a_en || q.option_a || '',
            option_b_en: q.option_b_en || q.option_b || '',
            option_c_en: q.option_c_en || q.option_c || '',
            option_d_en: q.option_d_en || q.option_d || '',
            option_a_hi: q.option_a_hi || '',
            option_b_hi: q.option_b_hi || '',
            option_c_hi: q.option_c_hi || '',
            option_d_hi: q.option_d_hi || '',
            correct_option: q.correct_option || 'a',
            explanation_en: q.explanation_en || q.explanation || '',
            explanation_hi: q.explanation_hi || '',
            difficulty: q.difficulty || 'moderate'
        }));

        this.questions.push(...newQuestions);
        this.save('questions', this.questions);

        // Update test question count
        const test = this.getTestById(testId);
        if (test) {
            this.updateTest(testId, {
                total_questions: this.getQuestionsByTestId(testId).length
            });
        }

        console.log(`✅ Added ${newQuestions.length} questions to test ${testId}`);
        return newQuestions;
    }

    importTestWithQuestions(importData) {
        // Create test first
        const test = this.createTest({
            name_en: importData.title_en || 'Imported Test',
            name_hi: importData.title_hi || '',
            subject: importData.subject || 'General',
            difficulty: importData.difficulty || 'moderate',
            questions: importData.questions?.length || 0,
            time: importData.time_limit_minutes || 120
        });

        // Add questions
        if (importData.questions && importData.questions.length > 0) {
            this.addQuestionsToTest(test.id, importData.questions);
        }

        return test;
    }

    // ===== SINGLE QUESTION MANAGEMENT =====

    addSingleQuestion(testId, questionData) {
        const existingQuestions = this.getQuestionsByTestId(testId);
        const nextNumber = existingQuestions.length + 1;

        const question = {
            id: this.generateId(),
            test_id: testId,
            question_number: questionData.question_number || nextNumber,
            question_text_en: questionData.question_text_en || questionData.question_text || questionData.question || '',
            question_text_hi: questionData.question_text_hi || '',
            option_a_en: questionData.option_a_en || questionData.option_a || '',
            option_b_en: questionData.option_b_en || questionData.option_b || '',
            option_c_en: questionData.option_c_en || questionData.option_c || '',
            option_d_en: questionData.option_d_en || questionData.option_d || '',
            option_a_hi: questionData.option_a_hi || '',
            option_b_hi: questionData.option_b_hi || '',
            option_c_hi: questionData.option_c_hi || '',
            option_d_hi: questionData.option_d_hi || '',
            correct_option: questionData.correct_option || 'a',
            explanation_en: questionData.explanation_en || questionData.explanation || '',
            explanation_hi: questionData.explanation_hi || '',
            difficulty: questionData.difficulty || 'moderate',
            created_at: new Date().toISOString()
        };

        this.questions.push(question);
        this.save('questions', this.questions);

        // Update test question count
        this.updateTest(testId, {
            total_questions: this.getQuestionsByTestId(testId).length
        });

        console.log(`✅ Added question #${question.question_number} to test ${testId}`);
        return question;
    }

    updateQuestion(questionId, updates) {
        const index = this.questions.findIndex(q => q.id === questionId);
        if (index !== -1) {
            this.questions[index] = {
                ...this.questions[index],
                ...updates,
                updated_at: new Date().toISOString()
            };
            this.save('questions', this.questions);
            console.log(`✅ Updated question ${questionId}`);
            return this.questions[index];
        }
        return null;
    }

    deleteQuestion(questionId) {
        const question = this.questions.find(q => q.id === questionId);
        if (!question) return false;

        const testId = question.test_id;
        const index = this.questions.findIndex(q => q.id === questionId);

        if (index !== -1) {
            this.questions.splice(index, 1);
            this.save('questions', this.questions);

            // Renumber remaining questions
            const remainingQuestions = this.getQuestionsByTestId(testId);
            remainingQuestions.forEach((q, i) => {
                q.question_number = i + 1;
            });
            this.save('questions', this.questions);

            // Update test question count
            this.updateTest(testId, {
                total_questions: remainingQuestions.length
            });

            console.log(`✅ Deleted question ${questionId}`);
            return true;
        }
        return false;
    }

    getQuestionById(questionId) {
        return this.questions.find(q => q.id === questionId);
    }

    // ===== TEST UTILITIES =====

    duplicateTest(testId) {
        const originalTest = this.getTestById(testId);
        if (!originalTest) return null;

        const originalQuestions = this.getQuestionsByTestId(testId);

        // Create new test with copied data
        const newTest = this.createTest({
            name_en: originalTest.name_en + ' (Copy)',
            name_hi: originalTest.name_hi ? originalTest.name_hi + ' (प्रति)' : '',
            subject: originalTest.subject_id,
            difficulty: originalTest.difficulty,
            questions: originalQuestions.length,
            time: originalTest.time_limit,
            mark_correct: originalTest.mark_correct,
            mark_wrong: originalTest.mark_wrong,
            source: originalTest.source,
            description: originalTest.description
        });

        // Copy questions
        if (originalQuestions.length > 0) {
            this.addQuestionsToTest(newTest.id, originalQuestions);
        }

        console.log(`✅ Duplicated test: ${newTest.name_en}`);
        return newTest;
    }

    exportTest(testId, format = 'json') {
        const test = this.getTestById(testId);
        if (!test) return null;

        const questions = this.getQuestionsByTestId(testId);

        const exportData = {
            test: {
                name_en: test.name_en,
                name_hi: test.name_hi,
                subject: test.subject_id,
                difficulty: test.difficulty,
                time_limit_minutes: test.time_limit,
                mark_correct: test.mark_correct,
                mark_wrong: test.mark_wrong,
                source: test.source,
                description: test.description
            },
            questions: questions.map(q => ({
                question_number: q.question_number,
                question_text_en: q.question_text_en,
                question_text_hi: q.question_text_hi,
                option_a_en: q.option_a_en,
                option_b_en: q.option_b_en,
                option_c_en: q.option_c_en,
                option_d_en: q.option_d_en,
                option_a_hi: q.option_a_hi,
                option_b_hi: q.option_b_hi,
                option_c_hi: q.option_c_hi,
                option_d_hi: q.option_d_hi,
                correct_option: q.correct_option,
                explanation_en: q.explanation_en,
                explanation_hi: q.explanation_hi,
                difficulty: q.difficulty
            })),
            exported_at: new Date().toISOString(),
            total_questions: questions.length
        };

        if (format === 'json') {
            return JSON.stringify(exportData, null, 2);
        }

        return exportData;
    }

    // ===== ACCESS KEYS =====

    getAllKeys() {
        return this.accessKeys;
    }

    generateKeyString() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = '';
        for (let i = 0; i < 4; i++) {
            if (i > 0) key += '-';
            for (let j = 0; j < 4; j++) {
                key += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }
        return key;
    }

    createKey() {
        const key = {
            id: this.generateId(),
            key: this.generateKeyString(),
            is_active: true,
            used: false,
            used_at: null,
            created_at: new Date().toISOString()
        };

        this.accessKeys.unshift(key);
        this.save('access_keys', this.accessKeys);

        // Also add to valid_keys for compatibility
        const validKeys = JSON.parse(localStorage.getItem('valid_keys') || '[]');
        if (!validKeys.includes(key.key)) {
            validKeys.push(key.key);
            localStorage.setItem('valid_keys', JSON.stringify(validKeys));
        }

        console.log('🔑 Key generated:', key.key);
        return key;
    }

    deleteKey(keyId) {
        const keyObj = this.accessKeys.find(k => k.id === keyId);
        if (keyObj) {
            // Remove from valid_keys
            const validKeys = JSON.parse(localStorage.getItem('valid_keys') || '[]');
            const idx = validKeys.indexOf(keyObj.key);
            if (idx !== -1) {
                validKeys.splice(idx, 1);
                localStorage.setItem('valid_keys', JSON.stringify(validKeys));
            }
        }

        const index = this.accessKeys.findIndex(k => k.id === keyId);
        if (index !== -1) {
            this.accessKeys.splice(index, 1);
            this.save('access_keys', this.accessKeys);
            return true;
        }
        return false;
    }

    // ===== STATS =====

    getStats() {
        return {
            totalTests: this.mockTests.length,
            totalQuestions: this.questions.length,
            totalKeys: this.accessKeys.length,
            activeKeys: this.accessKeys.filter(k => k.is_active).length,
            totalNotifications: this.getNotifications().length
        };
    }

    // ===== NOTIFICATIONS =====

    getNotifications() {
        return JSON.parse(localStorage.getItem('genz_notifications') || '[]');
    }

    createNotification(data) {
        const notification = {
            id: this.generateId(),
            title: data.title || 'New Notification',
            message: data.message || '',
            type: data.type || 'info', // info, warning, success, urgent
            created_at: new Date().toISOString(),
            is_active: true
        };

        const notifications = this.getNotifications();
        notifications.unshift(notification);
        localStorage.setItem('genz_notifications', JSON.stringify(notifications));

        console.log('📢 Notification created:', notification.title);
        return notification;
    }

    updateNotification(id, updates) {
        const notifications = this.getNotifications();
        const index = notifications.findIndex(n => n.id === id);

        if (index !== -1) {
            notifications[index] = { ...notifications[index], ...updates };
            localStorage.setItem('genz_notifications', JSON.stringify(notifications));
            console.log('✅ Notification updated:', id);
            return notifications[index];
        }
        return null;
    }

    deleteNotification(id) {
        const notifications = this.getNotifications();
        const index = notifications.findIndex(n => n.id === id);

        if (index !== -1) {
            notifications.splice(index, 1);
            localStorage.setItem('genz_notifications', JSON.stringify(notifications));
            console.log('🗑️ Notification deleted:', id);
            return true;
        }
        return false;
    }

    clearAllNotifications() {
        localStorage.setItem('genz_notifications', '[]');
        console.log('🗑️ All notifications cleared');
    }
}

// Create global instance
window.adminData = new AdminDataManager();
console.log('✅ Admin Data Manager loaded');
