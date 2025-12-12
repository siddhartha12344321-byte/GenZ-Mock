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

        // Initialize Firebase Sync
        this.initFirebaseSync();

        // Add default testing keys if not already present
        this.initDefaultKeys();

        // Add demo test if no tests exist
        // With Firebase, we check if we have tests there first
        // this.initDemoTest(); // Moved to inside initFirebaseSync

        console.log('📦 AdminDataManager initialized');
        console.log(`   - ${this.mockTests.length} tests`);
        console.log(`   - ${this.questions.length} questions`);
        console.log(`   - ${this.accessKeys.length} access keys`);
    }

    async initFirebaseSync() {
        if (!window.FirebaseSync) {
            console.log('⚠️ FirebaseSync not loaded yet');
            // Fallback to demo test if local is empty and no Firebase
            if (this.mockTests.length === 0) {
                this.initDemoTest();
            }
            return;
        }

        console.log('🔄 Syncing with Firebase...');

        try {
            // 1. Sync Keys
            const firebaseKeys = await FirebaseSync.getAllKeys();
            if (firebaseKeys.length > 0) {
                // Merge with local keys
                const localKeysMap = new Map(this.accessKeys.map(k => [k.key, k]));
                firebaseKeys.forEach(k => localKeysMap.set(k.key, k));
                this.accessKeys = Array.from(localKeysMap.values());
                this.save('access_keys', this.accessKeys);

                // Also update legacy valid_keys for compatibility
                const validKeys = this.accessKeys.filter(k => k.is_active).map(k => k.key);
                localStorage.setItem('valid_keys', JSON.stringify(validKeys));
                console.log('✅ Keys synced from Firebase');
            } else {
                // If Firebase has no keys, push default keys (initDefaultKeys handle this)
            }

            // 2. Sync Tests
            const firebaseTests = await FirebaseSync.getAllTests();
            if (firebaseTests.length > 0) {
                // Merge tests (prefer Firebase as truth for now)
                this.mockTests = firebaseTests;
                this.save('mock_tests', this.mockTests);
                console.log(`✅ ${firebaseTests.length} tests synced from Firebase`);
            } else {
                // If no tests in Firebase, check if we should push local default test
                if (this.mockTests.length === 0) {
                    this.initDemoTest();
                } else if (this.mockTests.some(t => t.id === 'polity_test_1')) {
                    // Push local demo test to Firebase
                    console.log('📤 Pushing local demo test to Firebase...');
                    const demoTest = this.mockTests.find(t => t.id === 'polity_test_1');
                    await FirebaseSync.saveTest(demoTest);
                    const demoQuestions = this.getQuestionsByTestId('polity_test_1');
                    await FirebaseSync.saveQuestions('polity_test_1', demoQuestions);
                }
            }

            // 3. Sync Questions
            // For now, lazy load questions when needed or sync all if small
            // Let's sync all for simplicity as we have small data
            const firebaseQuestions = await FirebaseSync.getAllQuestions();
            if (firebaseQuestions.length > 0) {
                this.questions = firebaseQuestions;
                this.save('questions', this.questions);
                console.log(`✅ ${firebaseQuestions.length} questions synced from Firebase`);
            }

        } catch (e) {
            console.error('❌ Firebase sync failed:', e);
            // Fallback to local if sync fails
            if (this.mockTests.length === 0) {
                this.initDemoTest();
            }
        }
    }

    initDefaultKeys() {
        const defaultKeys = ['GenZTesting1', 'GenZTesting2', 'GenZTesting3', 'GenZTesting4', 'GenZTesting5'];

        let existingKeys = this.accessKeys.map(k => k.key);
        let validKeys = JSON.parse(localStorage.getItem('valid_keys') || '[]');

        let added = false;

        defaultKeys.forEach(keyCode => {
            // Add to legacy valid_keys
            if (!validKeys.includes(keyCode)) {
                validKeys.push(keyCode);
            }

            // Add to access_keys object
            if (!existingKeys.includes(keyCode)) {
                const newKey = {
                    id: `key_${keyCode}`,
                    key: keyCode,
                    created_at: new Date().toISOString(),
                    is_active: true,
                    description: 'Default Testing Key'
                };
                this.accessKeys.push(newKey);

                // Sync to Firebase
                if (window.FirebaseSync) {
                    FirebaseSync.saveKey(newKey);
                }
                added = true;
            }
        });

        if (added) {
            this.save('access_keys', this.accessKeys);
            localStorage.setItem('valid_keys', JSON.stringify(validKeys));
            console.log('🔑 Default testing keys initialized');
        }
    }

    initDemoTest() {
        // Always set the default test (overwrite old data)
        const demoTest = {
            id: 'polity_test_1',
            name_en: 'Polity Test - 1',
            name_hi: 'राजव्यवस्था टेस्ट - 1',
            subject: 'polity',
            time_limit: 30,
            total_questions: 31,
            negative_marking: true,
            is_active: true,
            created_at: new Date().toISOString()
        };

        const demoQuestions = [
            { id: 'q1', test_id: 'polity_test_1', question_en: "Match the following pairs:\n\nList I\nA. Dhar Commission\nB. JVP Committee\nC. Fazl Ali Commission\n\nList II\n1. Recommended linguistic reorganization of states.\n2. Rejected language as the basis for reorganization.\n3. Report was the basis of States Reorganization Act, 1956.\n\nHow many pairs given above are correctly matched?", options: ["Only one", "Only two", "All three", "None"], correct_option: 1, explanation: "Pair A is incorrect: The Dhar Commission recommended reorganization based on administrative convenience, not linguistic factors. Pair B is correct: The JVP Committee rejected language as the basis for reorganization. Pair C is correct: The Fazl Ali Commission broadly accepted language as a basis and its recommendations formed the basis of the States Reorganization Act, 1956." },
            { id: 'q2', test_id: 'polity_test_1', question_en: "With reference to States Reorganization in India, arrange the following mentioned States in the chronological order of their formation as a State:\n\nI. Sikkim\nII. Himachal Pradesh\nIII. Manipur\nIV. Mizoram\n\nSelect the correct answer using the code given below:", options: ["I-III-IV-II", "III-I-IV-II", "II-III-I-IV", "IV-III-II-I"], correct_option: 2, explanation: "The correct chronological order of formation for the listed states/UTs is: Himachal Pradesh (II), Manipur (III), Sikkim (I), Mizoram (IV) — hence option c) II-III-I-IV." },
            { id: 'q3', test_id: 'polity_test_1', question_en: "With reference to Union Territories in India, consider the following statements:\n\nI. The President of India appoints an administrator for each union territory.\nII. The Parliament has the authority to make laws for union territories on any subject in the three lists.\nIII. All union territories have a high court located within.\nIV. The Ministry of Home Affairs plays a central role in overseeing matters related to union territories.\n\nWhich of the statements given above are correct?", options: ["I and IV only", "I, II and IV only", "II and III only", "I, II, III and IV"], correct_option: 1, explanation: "Answer: I, II and IV only. The President appoints administrators (Article 239). Parliament can legislate for Union Territories on subjects in all three lists (Article 246(4) read with Article 240 etc.). Not all UTs have a High Court located within them, so statement III is incorrect. The Ministry of Home Affairs usually oversees UT matters." },
            { id: 'q4', test_id: 'polity_test_1', question_en: "Consider the following statements with respect to the Indian Constitution:\n\nI. Article 2 empowers Parliament to admit or establish new states.\nII. Article 3 deals with alteration of the boundaries of existing states.\nIII. Article 2 and Article 3 require constitutional amendment by the procedure in Article 368.\n\nWhich of the statements given above are correct?", options: ["Only I and II", "Only II and III", "Only I and III", "I, II and III"], correct_option: 0, explanation: "Articles 2 and 3 give Parliament power regarding admission/formation and alteration of states; however, creation/alteration of states is effected by ordinary legislation (not always a constitutional amendment under Article 368). The solution in the source indicates statement I and II are correct in their scope (Article 2 relates to admission/establishment; Article 3 deals with alteration)." },
            { id: 'q5', test_id: 'polity_test_1', question_en: "Consider the following statements regarding the 'basic structure' doctrine:\n\nI. It does not apply to a law placed under the Ninth Schedule of the Constitution.\nII. India is the only legal system in the world which accepts the doctrine of 'basic structure' within its constitution.\n\nWhich of the statements is/are correct?", options: ["Only I", "Only II", "Both I and II", "Neither I nor II"], correct_option: 3, explanation: "Statement I is not correct in the absolute sense — the Ninth Schedule was created to protect certain laws, but later Supreme Court jurisprudence (e.g., Kesavananda Bharati followed by subsequent cases) has limited protection; the basic structure doctrine can be applied to laws even placed in Ninth Schedule in certain circumstances. Statement II is incorrect — the explanation notes that while India developed the doctrine through its courts, other jurisdictions have developed analogous controls; the source marks both statements incorrect." },
            { id: 'q6', test_id: 'polity_test_1', question_en: "Which of the following are grounds on which citizenship can be acquired in India as per the Citizenship Act of 1955?\n\nI. Birth\nII. Naturalisation\nIII. Registration\nIV. Marriage\nV. Descent\n\nSelect the correct answer using the code given below:", options: ["II, III, and IV only", "I, III, IV and V only", "I, II, III and V only", "I, II, III, IV and V"], correct_option: 2, explanation: "The Citizenship Act recognizes acquisition by Birth, Descent, Registration and Naturalization (and certain other modes). Marriage per se is not an independent ground separate from registration/naturalization; typical authoritative listing includes I, II, III and V." },
            { id: 'q7', test_id: 'polity_test_1', question_en: "'Basic structure' doctrine — consider the following statements:\n\nI. It will not apply to any law placed under the Ninth Schedule.\nII. India is the only legal system which accepts 'basic structure' doctrine within its constitution.\n\nWhich statement(s) is/are correct?", options: ["Only I", "Only II", "Both I and II", "Neither I nor II"], correct_option: 3, explanation: "Reiteration: Both statements are incorrect. The basic structure doctrine is a judicial principle limiting Parliament's amending power; the Ninth Schedule does not provide blanket immunity. India developed the doctrine, but wording that India is the 'only' system is not accepted as an absolute factual claim in the solutions." },
            { id: 'q8', test_id: 'polity_test_1', question_en: "Which of the following statements is/are correct regarding the citizenship provisions in the Constitution of India?\n\n1. Article 5 provided citizenship to persons domiciled in India at the commencement of the Constitution.\n2. Article 6 provided citizenship rights to persons who migrated from Pakistan to India before July 19, 1948, automatically if conditions were met.\n3. Article 7 provided that persons who migrated to Pakistan after March 1, 1947, but returned to India under a permit for resettlement, were automatically considered citizens.\n\nSelect the answer using the code given below:", options: ["1 only", "1 and 2 only", "2 and 3 only", "1, 2 and 3"], correct_option: 1, explanation: "Statements 1 and 2 are correct. Article 5 conferred citizenship on those domiciled in India who met specified conditions. Article 6 provided for migrants from Pakistan before 19 July 1948 to be citizens if they met the criteria. Statement 3 is incorrect: Article 7 concerns migrants to Pakistan who later returned; they were not automatically citizens — they had to register." },
            { id: 'q9', test_id: 'polity_test_1', question_en: "With reference to 'Overseas Citizen of India (OCI) Cardholders', consider the following statements:\n\nI. Registration of an OCI Cardholder can be cancelled if he/she has shown disaffection towards the Constitution of India.\nII. An OCI Cardholder is eligible to vote in Indian elections.\nIII. OCI Cardholders are eligible for appointment as teaching faculty in IITs and Central Universities.\n\nWhich of the above statements is/are incorrect?", options: ["I and II only", "II only", "I and III only", "I, II and III"], correct_option: 1, explanation: "Statement II is incorrect: OCI cardholders are not eligible to vote in Indian elections. Statement I is correct (registration can be cancelled for disaffection etc.). Statement III is correct: OCI holders are eligible for appointment as teaching staff in IITs, NITs, IIMs, central universities and certain central institutions. Thus the incorrect statement among the three is II only." },
            { id: 'q10', test_id: 'polity_test_1', question_en: "Consider the following statements regarding citizenship under the Indian Constitution:\n\nI. A person who voluntarily acquires citizenship of a foreign state ceases to be a citizen of India.\nII. Both citizens by birth and naturalized citizens are equally eligible for the office of President of India.\nIII. Overseas Indians residing outside India automatically became citizens of India after 1950 without registration.\n\nHow many statements given above are correct?", options: ["Only one", "Only two", "All three", "None"], correct_option: 0, explanation: "Statement I is correct: voluntary acquisition of a foreign citizenship leads to cessation of Indian citizenship. Statement II is incorrect: only citizens are eligible for President, but certain offices have distinctions; naturalised citizens are not eligible for the President's office — the President must be an Indian citizen (there are additional qualifications). Statement III is incorrect: Persons of Indian origin living abroad did not automatically become citizens after 1950 without registration. Hence only one statement is correct." },
            { id: 'q11', test_id: 'polity_test_1', question_en: "Which of the following correctly differentiate citizens from aliens in India?\n\na) Citizens enjoy political rights including voting and holding constitutional offices, while aliens do not.\nb) Aliens enjoy all rights available under Part III without any exceptions.\nc) Both citizens and aliens are equally eligible for public employment under Article 16.\n\nSelect the correct option:", options: ["a only", "b only", "c only", "a and c"], correct_option: 0, explanation: "Citizens enjoy political rights such as voting and eligibility for constitutional offices; aliens do not. Aliens do not enjoy all Part III rights without exceptions; many fundamental rights apply to all persons but some political rights are reserved for citizens. Public employment under Article 16 is generally for citizens; aliens are not equally eligible. So (a) only is the correct differentiator." },
            { id: 'q12', test_id: 'polity_test_1', question_en: "Which of the following are grounds on which citizenship can be acquired in India as per the Citizenship Act of 1955?\n\nI. Birth\nII. Naturalisation\nIII. Registration\nIV. Marriage\nV. Descent\n\nSelect the correct code:", options: ["II, III and IV only", "I, III, IV and V only", "I, II, III and V only", "I, II, III, IV and V"], correct_option: 2, explanation: "Reiterating the acquisition modes under the Citizenship Act: Birth, Descent, Registration and Naturalisation are recognized modes. Marriage may facilitate registration/naturalization but is not separately listed as an independent mode; authoritative choices group I, II, III and V as correct." },
            { id: 'q13', test_id: 'polity_test_1', question_en: "Which of the following statements is/are correct regarding termination of Indian citizenship (as per the Citizenship Act/related provisions)?\n\nI. When a citizen obtained citizenship by fraud.\nII. When a citizen has shown disloyalty to the Constitution of India.\nIII. When a citizen has been engaged in unlawful communication with an enemy during a time of war.\n\nHow many of the statements given above are correct?", options: ["Only one", "Only two", "All three", "None"], correct_option: 2, explanation: "All three are valid grounds under provisions relating to deprivation/termination of citizenship: fraud in acquisition, disloyalty to the Constitution, and unlawful communication with the enemy during war are grounds for compulsory termination. Hence all three are correct." },
            { id: 'q14', test_id: 'polity_test_1', question_en: "With reference to acquisition of citizenship through naturalization in India, consider the following statements:\n\nI. The President of India has the power to grant a certificate of naturalization to any person.\nII. Any person can acquire citizenship by naturalization if he/she is ordinarily a resident of India for 6 years.\n\nWhich of the following statements is/are correct?", options: ["I only", "II only", "Both I and II", "Neither I nor II"], correct_option: 2, explanation: "The President has the power to grant a certificate of naturalization. Naturalization rules require a specified period of ordinary residence (commonly cited as 12 years historically; however some provisions allow for shorter residence in special cases). The Solutions file frames both I and II as part of the question; the authoritative solution lists both as correct in the paper's context." },
            { id: 'q15', test_id: 'polity_test_1', question_en: "Consider the following statements about classification of Indian territory into states and union territories:\n\nStatement I: The classification implies a uniform application of constitutional provisions across all states.\nStatement II: The existence of special provisions for certain states and scheduled areas highlights the Constitution's flexibility in addressing regional and cultural diversity.\n\nWhich one is correct?", options: ["Both Statement-I and Statement-II are correct and Statement II explains Statement-I.", "Both Statement-I and Statement-II are correct, but Statement-II does not explain Statement-I.", "Statement-I is correct, but Statement-II is incorrect.", "Statement-I is incorrect, but Statement-II is correct."], correct_option: 3, explanation: "Statement I is incorrect — although many constitutional provisions apply generally, there are special provisions (e.g., Articles 370 previously, Articles 371 and schedules) showing exceptions. Statement II is correct: the Constitution provides special measures for certain states/scheduled areas to address regional/cultural diversity. Hence option d)." },
            { id: 'q16', test_id: 'polity_test_1', question_en: "Consider the following statements about the process of creating new Union Territories in India:\n\nI. An amendment to the Constitution of India.\nII. Mandatory approval from the state legislatures of affected states.\nIII. Enactment of legislation by the Parliament of India.\nIV. Mandatory ratification by all existing Union Territories.\n\nThe process of creating new Union Territories in India involves how many of the above actions?", options: ["Only two", "Only three", "All four", "None"], correct_option: 0, explanation: "Answer: Only two. The correct actions involved are (I) constitutional amendment/changes in territorial definition (Article 1 context) and (III) enactment of legislation by Parliament. Approval from affected state legislatures (their views may be sought) is not mandatory (their views are not binding), and mandatory ratification by existing Union Territories is not required." },
            { id: 'q17', test_id: 'polity_test_1', question_en: "At the commencement of the Indian Constitution, which of the following categories of persons automatically became Indian citizens?\n\nI. Persons domiciled in India and meeting prescribed birth/residency criteria.\nII. Persons who migrated to India from Pakistan before 19 July 1948 and were ordinarily resident in India thereafter.\n\nSelect the correct option:", options: ["Only I", "Only II", "I and II", "Neither I nor II"], correct_option: 2, explanation: "At commencement, persons domiciled in India meeting stipulated criteria under Article 5 became citizens, and migrants from Pakistan who came to India before 19 July 1948 and were ordinarily resident were covered under Article 6. Hence both I and II are correct." },
            { id: 'q18', test_id: 'polity_test_1', question_en: "Which of the following statements about India's citizenship provisions is correct?\n\nI. Indian citizens owe allegiance only to the Union and not to individual states.\nII. The Constitution deals with the problem of acquisition or loss of citizenship after its commencement.\n\nWhich of the statements given above is/are correct?", options: ["I only", "II only", "Both I and II", "Neither I nor II"], correct_option: 2, explanation: "Statement I is correct: India's single citizenship makes allegiance to the Union. Statement II is correct: Part II of the Constitution (Articles 5–11) addresses acquisition and termination of citizenship after commencement. So both are correct." },
            { id: 'q19', test_id: 'polity_test_1', question_en: "Consider the following statements in relation to inclusion of a territory into India (accession/merger etc.):\n\nI. The entire population of a new territory automatically becomes citizens.\nII. Even after becoming citizens of India, the population of a newly integrated territory may retain citizenship of the previous country in some situations.\n\nWhich of the above statements is/are correct?", options: ["Only I", "Only II", "Both I and II", "Neither I nor II"], correct_option: 1, explanation: "Statement I is not universally correct in absolute terms — acquisition of territory may require specific legal/constitutional steps for citizenship determination. Statement II can be true in certain scenarios where the previous country's laws or dual citizenship arrangements mean some persons retain previous citizenship. The Solutions indicate that the more nuanced reading is that II is the applicable one; the official answer in the solutions was that I is not correct and II can be correct, hence option b)." },
            { id: 'q20', test_id: 'polity_test_1', question_en: "Which of the following statements is/are true regarding the creation of new states under Articles 2 and 3 of the Constitution?\n\nI. Article 2 empowers Parliament to admit or establish new states.\nII. Article 3 deals with alteration of the boundaries of existing states.\nIII. Article 2 and Article 3 require constitutional amendment by the procedure in Article 368.\n\nWhich of the statements is/are correct?", options: ["I and II only", "II and III only", "I and III only", "I, II and III"], correct_option: 0, explanation: "Article 2 gives Parliament power to admit new states (typically by law), Article 3 deals with altering states/ boundaries; creation/alteration is effected through legislation, not necessarily by Article 368 amendment procedure. The solutions treat I and II as correct in substance." },
            { id: 'q21', test_id: 'polity_test_1', question_en: "Which of the following are the grounds on which citizenship can be acquired in India as per the Citizenship Act: Birth, Naturalisation, Registration, Marriage, Descent? (Select code)", options: ["II, III and IV only", "I, III, IV and V only", "I, II, III and V only", "I, II, III, IV and V"], correct_option: 2, explanation: "Reiterated from earlier items: typical authoritative list includes Birth, Descent, Registration and Naturalisation — thus I, II, III and V are the principal grounds recognized." },
            { id: 'q22', test_id: 'polity_test_1', question_en: "Which of the following statements is/are NOT correct regarding the basic structure doctrine and its interpretation?\n\nI. The doctrine prevents any amendment of the Constitution that destroys its essential features.\nII. The judiciary has an important role in defining the doctrine progressively through cases.\n\nWhich of the statements is/are incorrect?", options: ["Only I", "Only II", "Both I and II", "Neither I nor II"], correct_option: 3, explanation: "Both statements are accurate descriptions of the doctrine: it limits amendments that destroy essential features (I), and the judiciary has defined and refined the doctrine through successive cases (II). Thus neither statement is incorrect." },
            { id: 'q23', test_id: 'polity_test_1', question_en: "Which of the following is NOT a situation in which termination (deprivation) of Indian citizenship will occur under the Citizenship Act or related rules?\n\na) During the period of elections in India\nb) National emergency\nc) War in which India is engaged\nd) A national holiday\n\nChoose the option where termination will NOT occur:", options: ["a) During the period of elections in India", "b) National emergency", "c) War in which India is engaged", "d) A national holiday"], correct_option: 3, explanation: "Termination of citizenship is governed by statutory grounds (fraud, disloyalty, unlawful communication with enemy, etc.) and is not linked to national holidays. The Citizenship Act does not mention termination because of a national holiday; hence (d) is correct as 'not a situation' leading to termination." },
            { id: 'q24', test_id: 'polity_test_1', question_en: "Consider the following statements about OCI (Overseas Citizen of India) cardholders:\n\nI. Registration can be cancelled for showing disaffection towards the Constitution.\nII. OCI cardholders are eligible to vote.\nIII. OCI cardholders are eligible for appointment as teaching faculty in IITs and Central Universities.\n\nWhich statements are NOT correct?", options: ["I and II only", "II only", "I and III only", "I, II and III"], correct_option: 1, explanation: "Statement II is incorrect: OCI holders cannot vote in Indian elections. Statement I is correct (registration may be cancelled for disaffection). Statement III is correct: OCI holders are eligible for appointment as faculty in central educational institutions (IITs, central universities) as per government rules. Hence 'II only' is the incorrect statement." },
            { id: 'q25', test_id: 'polity_test_1', question_en: "The Constitution's flexibility in addressing regional and cultural diversity is illustrated by:\n\nStatement I: Classification into states and UTs implies uniform application of provisions.\nStatement II: Special provisions for certain states and scheduled areas highlight flexibility.\n\nWhich is correct?", options: ["Both correct and II explains I", "Both correct but II does not explain I", "I correct, II incorrect", "I incorrect, II correct"], correct_option: 3, explanation: "Statement I is incorrect because special provisions exist (e.g., Articles 371 etc.), and Statement II is correct — these provisions show constitutional flexibility. So option d)." },
            { id: 'q26', test_id: 'polity_test_1', question_en: "Which of the following statements about the termination of Indian citizenship are correct?\n\nI. When the citizen has obtained citizenship by fraud.\nII. When the citizen has shown disloyalty to the Constitution of India.\nIII. When the citizen has been engaged in unlawful communication with an enemy during a time of war.\n\nHow many of the statements given above are correct?", options: ["Only one", "Only two", "All three", "None"], correct_option: 2, explanation: "All three statements are correct grounds under the law for compulsory termination or deprivation of citizenship. Therefore, all three are correct." },
            { id: 'q27', test_id: 'polity_test_1', question_en: "At the commencement of the Constitution, persons domiciled in India and meeting prescribed criteria and persons who migrated to India from Pakistan before 19 July 1948 and were ordinarily resident thereafter—which of these categories automatically became citizens?", options: ["Only persons domiciled meeting criteria", "Only migrants from Pakistan before 19 July 1948", "Both categories I and II", "Neither category"], correct_option: 2, explanation: "Both categories (Article 5 and Article 6) were included at commencement: persons domiciled in India meeting birth/residence criteria and migrants from Pakistan before 19 July 1948 who were ordinarily resident were citizens at commencement." },
            { id: 'q28', test_id: 'polity_test_1', question_en: "Which of the following statements about Union Territories and administrators is correct?\n\nI. The President of India appoints an administrator for each Union Territory.\nII. The Parliament has authority to make laws for Union Territories on any subject contained in the three lists.\nIII. All Union Territories have a High Court located within.\nIV. The Ministry of Home Affairs plays a central role in overseeing matters related to Union Territories.\n\nWhich option is correct?", options: ["I and IV only", "I, II and IV only", "II and III only", "I, II, III and IV"], correct_option: 1, explanation: "Answer: I, II and IV only. The President appoints administrators; Parliament can legislate for UTs on subjects in the lists; MHA is centrally involved. Not all UTs have a High Court within the UT, so III is incorrect." },
            { id: 'q29', test_id: 'polity_test_1', question_en: "Which of the following best describes the role of Parliament when a new state or Union Territory is to be created or boundaries altered?", options: ["Parliament must obtain binding approval from state legislatures.", "Parliament enacts legislation (under Articles 2/3) and may seek views of state legislatures but their approval is not binding.", "Parliament cannot act without a constitutional amendment under Article 368.", "Parliament needs mandatory ratification from all existing Union Territories."], correct_option: 1, explanation: "Parliament enacts legislation for creation/alteration under Articles 2/3; it may seek views of affected state legislatures but those views are not binding. A constitutional amendment (Article 368) is not always required." },
            { id: 'q30', test_id: 'polity_test_1', question_en: "Which of the following statements about citizenship classification does the Constitution make at Article 1 and related provisions?", options: ["Article 1 defines the territory of India and any change in composition of UTs/state structure may require constitutional amendment or legislation as per context.", "Article 1 only deals with citizenship of individuals and not territory.", "Article 1 prohibits any change to territory without unanimous state legislature approval.", "Article 1 does not concern itself with states or union territories."], correct_option: 0, explanation: "Article 1 defines the territory of India including states and UTs; changes in composition are governed by constitutional provisions and parliamentary action; the 18th Amendment clarified aspects of Article 3 — option 1 is the correct thematic statement." },
            { id: 'q31', test_id: 'polity_test_1', question_en: "Final question (Q25): At the commencement of the Indian Constitution, which of the following categories of persons automatically became Indian citizens?\n\nI. Persons domiciled in India and meeting prescribed birth/residency criteria.\nII. Persons who migrated to India from Pakistan before 19 July 1948 and were ordinarily resident in India thereafter.\n\nSelect the correct option:", options: ["Only I", "Only II", "I and II", "Neither I nor II"], correct_option: 2, explanation: "At commencement, persons domiciled in India meeting the Article 5 criteria and persons who migrated from Pakistan before 19 July 1948 (Article 6) and were ordinarily resident thereafter became Indian citizens. So both I and II." }
        ];

        // Keep local storage updated
        this.mockTests = [demoTest];
        this.questions = demoQuestions;
        this.save('mock_tests', this.mockTests);
        this.save('questions', this.questions);

        // Also push to Firebase if available
        if (window.FirebaseSync) {
            FirebaseSync.saveTest(demoTest);
            FirebaseSync.saveQuestions(demoTest.id, demoQuestions);
        }

        console.log('📝 Polity Test - 1 with 31 questions added!');
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

    // Get only active tests (not drafts) - for student dashboard
    getActiveTests() {
        return this.mockTests.filter(t => t.status !== 'draft');
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
            status: testData.status || 'active', // 'active' or 'draft'
            is_active: true,
            created_at: new Date().toISOString(),
            attempts: 0
        };

        this.mockTests.unshift(test);
        this.save('mock_tests', this.mockTests);

        // Sync to Firebase
        if (window.FirebaseSync) {
            FirebaseSync.saveTest(test);
        }

        console.log('✅ Test created:', test.name_en);
        return test;
    }

    updateTest(id, updates) {
        const index = this.mockTests.findIndex(t => t.id === id);
        if (index !== -1) {
            this.mockTests[index] = { ...this.mockTests[index], ...updates };
            this.save('mock_tests', this.mockTests);

            // Sync to Firebase
            if (window.FirebaseSync) {
                FirebaseSync.saveTest(this.mockTests[index]);
            }

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

            // Sync to Firebase
            if (window.FirebaseSync) {
                FirebaseSync.deleteTest(id);
            }

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

        // Sync to Firebase
        if (window.FirebaseSync) {
            const allTestQuestions = this.getQuestionsByTestId(testId);
            FirebaseSync.saveQuestions(testId, allTestQuestions);
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

        // Sync to Firebase
        if (window.FirebaseSync) {
            const allTestQuestions = this.getQuestionsByTestId(testId);
            FirebaseSync.saveQuestions(testId, allTestQuestions);
        }

        console.log(`✅ Added question #${question.question_number} to test ${testId}`);
        return question;
    }

    updateQuestion(questionId, updates) {
        const index = this.questions.findIndex(q => q.id === questionId);
        if (index !== -1) {
            const testId = this.questions[index].test_id;

            this.questions[index] = {
                ...this.questions[index],
                ...updates,
                updated_at: new Date().toISOString()
            };
            this.save('questions', this.questions);

            // Sync to Firebase
            if (window.FirebaseSync) {
                const allTestQuestions = this.getQuestionsByTestId(testId);
                FirebaseSync.saveQuestions(testId, allTestQuestions);
            }

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

            // Sync to Firebase
            if (window.FirebaseSync) {
                FirebaseSync.saveQuestions(testId, remainingQuestions);
            }

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

        // Sync to Firebase
        if (window.FirebaseSync) {
            FirebaseSync.saveKey(key);
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

            // Sync to Firebase
            if (window.FirebaseSync) {
                FirebaseSync.deleteKey(keyId);
            }

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
