/**
 * FAQ data — all sections with English and Marathi Q&A.
 * Pass isMarathi=true to get Marathi content.
 */
export const getFaqSections = (isMarathi) => [
  {
    titleEn: 'Getting Started',
    titleMr: 'सुरुवात',
    items: [
      {
        q: isMarathi ? 'अमृत मॅनेज म्हणजे काय आणि ते कोणासाठी आहे?' : 'What is Amrit Manage and who is it for?',
        a: isMarathi
          ? 'अमृत मॅनेज हे भारतीय दूध विक्रेत्यांसाठी बनवलेले डेअरी व्यवसाय व्यवस्थापन प्लॅटफॉर्म आहे. रोजचे वितरण नोंदवणे, मासिक बिले आपोआप तयार करणे, ग्राहकांची देयके ट्रॅक करणे आणि कर्मचारी व्यवस्थापन — सर्व काही एकाच ठिकाणी. तुमच्याकडे १० ग्राहक असोत किंवा शेकडो — अमृत मॅनेज तुमची वही बदलते.'
          : 'Amrit Manage is a dairy business management platform built specifically for Indian milk vendors. It helps you record daily deliveries, generate monthly bills automatically, track customer payments, and manage your delivery staff. Whether you have 10 customers or hundreds, Amrit Manage replaces your notebook with a simple phone-based system.',
      },
      {
        q: isMarathi ? 'अमृत मॅनेज अॅप आहे की वेबसाइट?' : 'Is Amrit Manage an app or a website?',
        a: isMarathi
          ? 'हे एक Progressive Web App (PWA) आहे. तुम्ही फोन ब्राउझरमधून उघडता आणि होम स्क्रीनवर जोडता — अगदी नेटिव्ह अॅपसारखे काम करते. Play Store किंवा App Store वरून डाउनलोड करण्याची गरज नाही. Android आणि iPhone दोन्हींवर चालते.'
          : 'It is a Progressive Web App (PWA). You access it through your phone browser, and you can add it to your home screen so it works exactly like a native app. It does not require any download from the Play Store or App Store. It works on Android and iPhone, and always stays updated automatically.',
      },
      {
        q: isMarathi ? 'वापरण्यासाठी संगणक लागतो का?' : 'Do I need a computer to use it?',
        a: isMarathi
          ? 'नाही. अमृत मॅनेज मोबाइल-फर्स्ट डिझाइन केलेले आहे. वितरण नोंदवणे, बिले तयार करणे, कर्मचारी व्यवस्थापन — सर्व काही स्मार्टफोनवरून करता येते. संगणकाची कुठेही गरज नाही.'
          : 'No. Amrit Manage is designed mobile-first. Everything, from recording deliveries to generating bills to managing staff, can be done entirely from your smartphone. A computer is not required at any point.',
      },
      {
        q: isMarathi ? 'सेटअप होण्यास किती वेळ लागतो?' : 'How long does it take to set up?',
        a: isMarathi
          ? 'बहुतेक विक्रेते ३० ते ६० मिनिटांत पूर्णपणे सेटअप होतात. ग्राहक जोडणे (नाव, फोन, सकाळ-संध्याकाळचे प्रमाण, दर), कर्मचारी जोडणे — एवढे केले की लगेच नोंदी सुरू करता येतात.'
          : 'Most vendors are fully set up within 30 to 60 minutes. You start by adding your customers (name, phone, morning and evening quantity, rate per litre), then add your delivery staff if any. After that, your staff can start recording deliveries immediately.',
      },
      {
        q: isMarathi ? 'मराठीत वापरता येते का?' : 'Can I use it in Hindi or Marathi?',
        a: isMarathi
          ? 'होय! तुम्ही आत्ता मराठीत वापरत आहात. नेव्हिगेशन बारमधील भाषा बटण वापरून इंग्रजी आणि मराठी दरम्यान कधीही स्विच करा.'
          : 'Yes! You can switch to Marathi using the language button in the navigation bar. Click the globe icon to toggle between English and Marathi.',
      },
    ],
  },
  {
    titleEn: 'Trial and Pricing',
    titleMr: 'ट्रायल आणि किंमत',
    items: [
      {
        q: isMarathi ? 'ट्रायलमध्ये काय समाविष्ट आहे?' : 'What is included in the trial?',
        a: isMarathi
          ? 'ट्रायलमध्ये अमृत गोल्डच्या सर्व वैशिष्ट्यांचा समावेश आहे: सर्वाधिक १५० ग्राहक, ५ कर्मचारी लॉगिन, आपोआप मासिक बिलिंग, देयक ट्रॅकिंग, WhatsApp अलर्ट, PDF बिल डाउनलोड आणि डिफॉल्ट दर व्यवस्थापन. ट्रायल आमच्या टीमशी चर्चेनंतर सुरू होते.'
          : 'The trial gives you full access to all Amrit Gold features: up to 150 customers, up to 5 staff logins, automatic monthly billing, payment tracking, WhatsApp delivery alerts, PDF bill download, and default rate management. The trial is activated after a brief discussion with our team.',
      },
      {
        q: isMarathi ? 'ट्रायल संपल्यावर काय होते?' : 'What happens after the trial ends?',
        a: isMarathi
          ? 'ट्रायलनंतर खाते रीड-ओन्ली होते. जुना डेटा पाहता येतो पण नवीन नोंदी करता येत नाहीत. डेटा कधीही डिलीट होत नाही. सुरू ठेवण्यासाठी योजना निवडा आणि आमची टीम सदस्यता सक्रिय करते.'
          : 'After the trial period, your account enters read-only mode. You can still view your existing data but cannot add new entries or generate bills. Your data is never deleted. To continue, you choose a plan and our team activates your subscription.',
      },
      {
        q: isMarathi ? 'पेमेंट कसे होते? ऑनलाइन आहे का?' : 'How does payment work? Is it online?',
        a: isMarathi
          ? 'आम्ही ऑनलाइन पेमेंट प्रक्रिया करत नाही. सदस्यता घेण्यासाठी तुम्ही तपशील भरता आणि आमची टीम २४ तासांत संपर्क करून पेमेंट घेते. यामुळे वैयक्तिक आणि सुरक्षित अनुभव मिळतो.'
          : 'We do not process payments online. When you are ready to subscribe, you fill in your contact and billing details, and our team calls you within 24 hours to confirm and collect payment. This ensures a personal, secure experience.',
      },
      {
        q: isMarathi ? 'कोणत्या योजना उपलब्ध आहेत?' : 'What are the available plans?',
        a: isMarathi
          ? 'तीन योजना आहेत: अमृत सिल्व्हर (मूलभूत, ५० ग्राहक), अमृत गोल्ड (पूर्ण वैशिष्ट्ये, १५० ग्राहक, ५ कर्मचारी), अमृत प्लॅटिनम (अमर्यादित ग्राहक, १५ कर्मचारी, प्रगत अहवाल, प्राधान्य सपोर्ट). सर्व योजनांमध्ये एकवेळ सेटअप फी समाविष्ट आहे.'
          : 'We offer three plans: Amrit Silver (basic, up to 50 customers), Amrit Gold (full features, up to 150 customers, up to 5 staff), and Amrit Platinum (unlimited customers, up to 15 staff, advanced reports, priority support). All plans include a one-time setup fee.',
      },
      {
        q: isMarathi ? 'सेटअप फी दरवर्षी आकारली जाते का?' : 'Is the setup fee charged every year?',
        a: isMarathi
          ? 'नाही. सेटअप फी फक्त एकदाच, पेड योजना पहिल्यांदा सुरू करताना. नंतर फक्त मासिक किंवा वार्षिक सदस्यता शुल्क.'
          : 'No. The setup fee is a one-time charge paid only when you first activate a paid plan. After that, you only pay the monthly or yearly subscription fee.',
      },
      {
        q: isMarathi ? 'नंतर योजना बदलता येते का?' : 'Can I switch plans later?',
        a: isMarathi
          ? 'हो. आमच्या टीमशी संपर्क करून कधीही अपग्रेड किंवा डाउनग्रेड करता येते. अपग्रेड लगेच लागू होते. डाउनग्रेड पुढील नूतनीकरण तारखेपासून लागू होते.'
          : 'Yes. You can upgrade or downgrade your plan at any time by contacting our team. Upgrades take effect immediately. Downgrades take effect at the next renewal date.',
      },
    ],
  },
  {
    titleEn: 'Customers and Deliveries',
    titleMr: 'ग्राहक आणि वितरण',
    items: [
      {
        q: isMarathi ? 'वेगवेगळ्या ग्राहकांचे वेगळे दर ठेवता येतात का?' : 'Can I set different milk rates for different customers?',
        a: isMarathi
          ? 'हो. प्रत्येक ग्राहकाचा स्वतःचा दर प्रति लिटर असतो. डिफॉल्ट दर सेट करता येतो आणि कोणत्याही ग्राहकासाठी वेगळा दर ठेवता येतो. बिल तयार होताना योग्य दर आपोआप वापरला जातो.'
          : 'Yes. Each customer has their own rate per litre. You can set a default rate that applies to all new customers, and then override it individually for any customer. When bills are generated, the correct rate is used automatically.',
      },
      {
        q: isMarathi ? 'सकाळ आणि संध्याकाळ दोन्ही नोंदी होतात का?' : 'Can I record both morning and evening deliveries?',
        a: isMarathi
          ? 'हो. प्रत्येक नोंदीला स्लॉट असतो: सकाळ किंवा संध्याकाळ. मासिक बिलात दोन्ही एकत्र दिसतात आणि लॉग्समध्ये वेगळेही पाहता येतात.'
          : 'Yes. Every delivery entry has a slot: morning or evening. Your staff selects the slot when recording. The monthly bill shows the total quantity combining both slots, and you can also view them separately in the logs.',
      },
      {
        q: isMarathi ? 'एखाद्या दिवशी ग्राहकाने जास्त दूध घेतले तर?' : 'What if a customer takes extra milk on some days?',
        a: isMarathi
          ? 'नोंद करताना कर्मचारी बेस प्रमाणावर अतिरिक्त लिटर जोडू शकतो. उदा. बेस २L असेल आणि ग्राहकाने २.५L घेतले तर ०.५L एक्स्ट्रा टाकतो. बिलात प्रत्यक्ष दिलेले प्रमाण दिसते.'
          : 'When recording a delivery, your staff can add extra litres on top of the base quantity. For example, if the base is 2L and the customer takes 2.5L that day, the staff enters 0.5L extra. The bill reflects the actual quantity delivered.',
      },
      {
        q: isMarathi ? 'विशिष्ट ग्राहक विशिष्ट कर्मचाऱ्याला नियुक्त करता येतात का?' : 'Can I assign specific customers to specific staff members?',
        a: isMarathi
          ? 'हो. ग्राहक जोडताना किंवा संपादित करताना कर्मचारी नियुक्त करता येतो. तो कर्मचारी फक्त त्याच्या ग्राहकांची यादी पाहतो. नियुक्त नसलेले ग्राहक सर्व कर्मचाऱ्यांना दिसतात.'
          : 'Yes. When adding or editing a customer, you can assign them to a specific staff member. That staff member will then see only their assigned customers. Unassigned customers are visible to all staff.',
      },
      {
        q: isMarathi ? 'किती ग्राहक जोडता येतात?' : 'How many customers can I add?',
        a: isMarathi
          ? 'अमृत सिल्व्हरमध्ये ५०, गोल्डमध्ये १५०, प्लॅटिनममध्ये अमर्यादित. ट्रायलमध्ये गोल्डची मर्यादा मिळते.'
          : 'Amrit Silver allows up to 50 customers. Amrit Gold allows up to 150 customers. Amrit Platinum has no limit. During the trial, you get the Gold limit of 150 customers.',
      },
    ],
  },
  {
    titleEn: 'Staff and Access',
    titleMr: 'कर्मचारी आणि प्रवेश',
    items: [
      {
        q: isMarathi ? 'कर्मचाऱ्याला बिलिंग माहिती दिसेल का?' : 'Can my delivery staff use the app without seeing my billing information?',
        a: isMarathi
          ? 'नाही. कर्मचारी फक्त त्यांच्या ग्राहकांसाठी वितरण नोंदवू शकतात. बिलिंग रक्कम, देयक इतिहास, अहवाल, ग्राहकांचे दर किंवा कोणतीही आर्थिक माहिती दिसत नाही. हे सिस्टममध्ये बांधलेले आहे.'
          : 'Yes. Staff accounts have restricted access. They can only record deliveries for their assigned customers. They cannot see billing amounts, payment history, reports, customer rates, or any financial information. This separation is built into the system.',
      },
      {
        q: isMarathi ? 'कर्मचारी कसे लॉगिन करतात?' : 'How does my staff log in?',
        a: isMarathi
          ? 'कर्मचारी त्यांच्या फोन नंबर आणि तुम्ही सेट केलेल्या पासवर्डने लॉगिन करतात. तुम्ही कधीही डॅशबोर्डवरील कर्मचारी विभागातून पासवर्ड रीसेट करू शकता.'
          : 'Staff log in using their phone number and a password that you set when creating their account. You can reset their password at any time from the Staff section of your dashboard.',
      },
      {
        q: isMarathi ? 'किती कर्मचारी जोडता येतात?' : 'How many staff members can I add?',
        a: isMarathi
          ? 'अमृत सिल्व्हरमध्ये २, गोल्डमध्ये ५, प्लॅटिनममध्ये १५. ट्रायलमध्ये गोल्डची मर्यादा मिळते.'
          : 'Amrit Silver allows up to 2 staff. Amrit Gold allows up to 5 staff. Amrit Platinum allows up to 15 staff. During the trial, you get the Gold limit of 5 staff accounts.',
      },
      {
        q: isMarathi ? 'कर्मचारी खाते डिलीट न करता बंद करता येते का?' : 'Can I disable a staff account without deleting it?',
        a: isMarathi
          ? 'हो. कर्मचारी विभागातून कोणतेही खाते बंद करता येते. बंद खाते लॉगिन करू शकत नाही पण जुन्या नोंदी जपल्या जातात. कधीही पुन्हा सुरू करता येते.'
          : 'Yes. You can disable any staff account from the Staff section. A disabled account cannot log in, but all their past delivery records are preserved. You can re-enable the account at any time.',
      },
    ],
  },
  {
    titleEn: 'Billing and Payments',
    titleMr: 'बिलिंग आणि देयके',
    items: [
      {
        q: isMarathi ? 'आपोआप बिलिंग कसे काम करते?' : 'How does automatic billing work?',
        a: isMarathi
          ? 'महिन्याच्या शेवटी "बिले तयार करा" क्लिक करा. अमृत मॅनेज प्रत्येक ग्राहकाचे बिल रोजच्या नोंदी आणि दराप्रमाणे काढते. मागील महिन्याची थकबाकी पुढे नेली जाते. तुम्ही एकदा तपासा आणि ग्राहकांना पाठवा.'
          : 'At the end of each month, you click "Generate Bills" in the Billing section. Amrit Manage calculates each customer\'s bill based on their daily delivery records and their rate per litre. It also carries forward any unpaid balance from the previous month.',
      },
      {
        q: isMarathi ? 'ग्राहकाचे देयक कसे नोंदवायचे?' : 'How do I record a payment from a customer?',
        a: isMarathi
          ? 'बिलिंग विभागात ग्राहकाचे बिल शोधा आणि "देयक नोंदवा" क्लिक करा. मिळालेली रक्कम आणि पेमेंट पद्धत (रोख, UPI, बँक ट्रान्सफर) टाका. शिल्लक लगेच अपडेट होते. आंशिक देयकेही नोंदवता येतात.'
          : 'In the Billing section, find the customer\'s bill and click "Record Payment". Enter the amount received and the payment method (cash, UPI, bank transfer, etc.). The balance updates immediately. You can record partial payments too.',
      },
      {
        q: isMarathi ? 'WhatsApp वर बिले पाठवता येतात का?' : 'Can I share bills with customers on WhatsApp?',
        a: isMarathi
          ? 'हो. बिल तयार झाल्यावर ग्राहकाच्या WhatsApp नंबरवर थेट पाठवता येते. एकूण लिटर, देय रक्कम आणि मागील शिल्लक दाखवणारा संदेश पाठवला जातो. यासाठी WhatsApp इंटिग्रेशन सेटअप असणे आवश्यक आहे.'
          : 'Yes. Once a bill is generated, you can send it directly to the customer\'s WhatsApp number. The bill is sent as a formatted message showing the total litres, amount due, and any previous balance. This feature requires the WhatsApp integration to be set up.',
      },
      {
        q: isMarathi ? 'वितरण नोंदीत चूक झाली तर?' : 'What if I made an error in a delivery entry?',
        a: isMarathi
          ? 'मालक लॉग्स विभागातून कोणतीही नोंद संपादित किंवा डिलीट करू शकतात. कर्मचारी त्याच दिवशी केलेल्या नोंदी संपादित करू शकतात.'
          : 'Owners can edit or delete any delivery log entry from the Logs section. You can correct the extra litres, add a note, or delete the entry entirely. Staff can also edit their own entries on the same day they were recorded.',
      },
    ],
  },
  {
    titleEn: 'Data and Security',
    titleMr: 'डेटा आणि सुरक्षा',
    items: [
      {
        q: isMarathi ? 'डेटा सुरक्षित आहे का? फोन हरवला तर?' : 'Is my data safe? What if I lose my phone?',
        a: isMarathi
          ? 'सर्व डेटा आमच्या सुरक्षित सर्व्हरवर साठवला जातो, फोनवर नाही. फोन हरवला तरी डेटावर काहीही परिणाम होत नाही. कोणत्याही डिव्हाइसवरून लॉगिन करता येते. एन्क्रिप्टेड कनेक्शन आणि सुरक्षित स्टोरेज वापरले जाते.'
          : 'All data is stored securely on our servers, not on your phone. Losing your phone does not affect your data in any way. You can log in from any device using your phone number and password. We use encrypted connections and secure storage for all data.',
      },
      {
        q: isMarathi ? 'डेटा एक्सपोर्ट करता येतो का?' : 'Can I export my data?',
        a: isMarathi
          ? 'हो. गोल्ड आणि प्लॅटिनम योजनांमध्ये डेटा एक्सपोर्ट समाविष्ट आहे. वितरण लॉग्स, ग्राहक यादी आणि बिलिंग इतिहास डाउनलोड करता येतो. प्लॅटिनममध्ये Excel आणि PDF फॉरमॅटमध्ये प्रगत एक्सपोर्ट पर्याय आहेत.'
          : 'Yes. Amrit Gold and Platinum plans include data export. You can download your delivery logs, customer list, and billing history. Amrit Platinum includes advanced export options including Excel and PDF formats.',
      },
      {
        q: isMarathi ? 'सदस्यता रद्द केल्यावर डेटाचे काय होते?' : 'What happens to my data if I cancel my subscription?',
        a: isMarathi
          ? 'रद्द केल्यानंतर ९० दिवस डेटा जपला जातो. या काळात सदस्यता पुन्हा सुरू करता येते. ९० दिवसांनंतर डेटा कायमचा डिलीट होतो. रद्द करण्यापूर्वी डेटा एक्सपोर्ट करण्याची शिफारस आहे.'
          : 'Your data is retained for 90 days after cancellation. During this period, you can reactivate your subscription and resume from where you left off. After 90 days, data is permanently deleted. We recommend exporting your data before cancelling.',
      },
      {
        q: isMarathi ? 'तुम्ही डेटा कोणाशी शेअर करता का?' : 'Do you share my data or my customers\' data with anyone?',
        a: isMarathi
          ? 'नाही. आम्ही तुमचा किंवा तुमच्या ग्राहकांचा डेटा कोणत्याही तृतीय पक्षाला विकत नाही, शेअर करत नाही किंवा भाड्याने देत नाही. तुमची व्यवसाय माहिती फक्त अमृत मॅनेज सेवा पुरवण्यासाठी वापरली जाते.'
          : 'No. We do not sell, share, or rent your data or your customers\' data to any third party. Your business information and customer records are used only to provide the Amrit Manage service to you. See our Privacy Policy for full details.',
      },
    ],
  },
];
