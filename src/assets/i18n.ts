import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const en = {
  // ── Common ──────────────────────────────────────────────────────────────────
  back: "Back",
  continue: "Continue",
  next: "Next",
  done: "Done",
  locked: "Locked",

  // ── Header ──────────────────────────────────────────────────────────────────
  header_subtitle: "Self Registration",
  header_title: "KYC Onboarding",

  // ── Stepper ──────────────────────────────────────────────────────────────────
  stepper_goto: "Go to {{label}}",
  stepper_counter: "Step {{current}} of {{total}}",

  // ── Step labels ───────────────────────────────────────────────────────────────
  step_msisdn: "Mobile Number",
  step_consent: "Consent",
  step_selfie: "Selfie & Liveness",
  step_document: "Document Capture",
  step_ocr: "OCR & MRZ",
  step_signature: "Signature",
  step_match: "Face Match",

  // ── MSISDN ────────────────────────────────────────────────────────────────────
  msisdn_title: "Verify your number",
  msisdn_subtitle_otp: "We sent a code to your number.",
  msisdn_subtitle_idle: "Enter your mobile number to get started.",
  msisdn_label: "Mobile number",
  msisdn_error_invalid: "Enter a valid international number (e.g. +243970000001)",
  msisdn_error_registered: "This number is already registered.",
  msisdn_error_captcha: "Security check not ready yet. Please wait a moment.",
  msisdn_error_send: "Failed to send verification code. Please try again.",
  msisdn_sending: "Sending code…",
  msisdn_send: "Send verification code →",
  msisdn_code_sent: "Code sent to {{phone}}",
  msisdn_change: "Change number",
  msisdn_error_resend: "Failed to resend code. Please try again.",
  msisdn_recaptcha: "Protected by reCAPTCHA —",
  msisdn_privacy: "Privacy",
  msisdn_terms: "Terms",

  // ── OTP ───────────────────────────────────────────────────────────────────────
  otp_label: "Enter the {{count}}-digit code.",
  otp_verifying: "Verifying…",
  otp_verify: "Verify Code",
  otp_no_receive: "Didn't receive it?",
  otp_resend: "Resend code",
  otp_wait: "Didn't receive it? Wait for the timer to resend.",
  otp_attempts_remaining_one: "{{count}} attempt remaining",
  otp_attempts_remaining_other: "{{count}} attempts remaining",

  // ── Consent ───────────────────────────────────────────────────────────────────
  consent_title: "Consent and privacy notice",
  consent_desc_1:
    "By proceeding, you agree to use this secure, mobile-friendly portal to complete your SIM card registration remotely.",
  consent_desc_2:
    "This process ensures compliance and prevents fraud through validation and liveness checks.",
  consent_checkbox:
    "I agree to biometric capture and document processing for identity verification.",
  consent_models_loading: "Loading face recognition models, please wait…",

  // ── Selfie ────────────────────────────────────────────────────────────────────
  selfie_title: "Selfie & Liveness Check",
  selfie_detecting: "Position your face in the frame to begin.",
  selfie_ready_phase: "Face detected! Ready to start the challenge.",
  selfie_challenging: "Challenge {{index}} of {{total}}",
  selfie_timeout_phase: "Challenge timed out.",
  selfie_done_phase: "Liveness verified — capturing photos now.",
  selfie_front_guide: "Auto-capture will start when your face is ready.",
  selfie_front_countdown: "Capturing in {{count}}s — hold still!",
  selfie_front_captured_phase: "Front photo captured!",
  selfie_side_guide_phase: "Now turn your head to capture the side profile.",
  selfie_side_ready_phase: "Perfect! Tap the button to take the side photo.",
  selfie_complete: "All done! Moving to next step…",
  selfie_badge_side: "Step 2 / 2 — Side",
  selfie_badge_front: "Step 1 / 2 — Front",
  selfie_badge_liveness: "Liveness verified",
  selfie_badge_challenge: "Challenge {{index}} / {{total}}",
  selfie_detecting_face: "Detecting your face…",
  selfie_face_title: "Face Detected!",
  selfie_ready_desc:
    "You'll be given {{count}} quick challenges. Each has 10 seconds. Ready?",
  selfie_btn_ready: "I'm Ready →",
  selfie_challenge_label: "Challenge {{index}} of {{total}}",
  selfie_timeout_title: "Time's Up!",
  selfie_timeout_desc:
    "You didn't complete the challenge in time. Let's try again.",
  selfie_btn_retry: "Retry Challenges →",
  selfie_btn_manual: "Capture manually",
  selfie_btn_capture_side: "Capture Side Photo",
  selfie_btn_turn_unlock: "Turn further to unlock →",
  selfie_challenge_progress: "Challenge progress",
  selfie_photo_guide: "Photo guide",
  selfie_front_photo: "Front Photo",
  selfie_front_desc:
    "Face the camera directly. Auto-capture begins when your face quality is good.",
  selfie_side_photo: "Side Photo",
  selfie_side_desc:
    "Slowly turn your head right. The button activates when angle is good.",
  selfie_turn_angle: "Turn angle",
  selfie_captured: "Captured",
  selfie_front_label: "Front",
  selfie_side_label: "Side",
  selfie_btn_retake: "Retake photos",
  selfie_auto_capturing: "Auto-capturing…",
  selfie_complete_liveness: "Complete liveness first",
  selfie_turn_head: "Turn your head to unlock →",

  // ── Status banner ─────────────────────────────────────────────────────────────
  banner_position: "Position your face in the oval to begin auto-capture",
  banner_closer: "Face detected — move a little closer for better quality",
  banner_hold: "Hold still — starting auto-capture…",
  banner_countdown: "Capturing in {{count}}… hold still and look at the camera",
  banner_front_captured: "Front photo captured! Preparing side photo…",
  banner_side_title: "Now take a side photo",
  banner_side_hint:
    "Slowly turn your head to the right until the indicator fills",
  banner_side_ready: "Perfect angle! Tap the button to capture.",
  banner_all_captured: "All photos captured! Proceeding…",

  // ── Document ──────────────────────────────────────────────────────────────────
  doc_title: "Document capture",
  doc_subtitle:
    "Choose your document type, then capture or upload clear photos.",
  doc_type_label: "Document type",
  doc_passport: "Passport",
  doc_national_id: "Voter ID",
  doc_drivers: "Driver's License",
  doc_hint_passport:
    "Open to the photo/data page. Ensure the MRZ (two lines at the bottom) is fully visible.",
  doc_hint_national_id:
    "Capture the front side first, then the back. Make sure all four corners are visible.",
  doc_hint_drivers:
    "Capture the front side first, then the back. Hold the card flat to avoid glare.",
  doc_passport_guide: "How to capture your passport",
  doc_step_1: "Open your passport to the photo/data page.",
  doc_step_2: "Place it flat on a well-lit, dark surface.",
  doc_step_3: "All four corners of the page must be visible.",
  doc_step_4: "Ensure the MRZ (two lines at the bottom) is fully readable.",
  doc_step_5: "Avoid glare, shadows, or obstructions.",
  doc_camera: "Camera",
  doc_upload: "Upload",
  doc_btn_ocr: "Run OCR & MRZ",
  doc_btn_ocr_running: "Running OCR…",
  doc_hint_front: "Capture or upload the front side to continue.",
  doc_hint_back: "Capture or upload the back side to continue.",
  doc_front_captured: "Front captured",
  doc_back_captured: "Back captured",

  // ── Document side ─────────────────────────────────────────────────────────────
  side_front_heading: "Front side",
  side_back_heading: "Back side",
  side_front_capture: "Capture front",
  side_back_capture: "Capture back",
  side_align: "Align document within the frame",
  side_upload_prompt: "Upload {{side}} of {{docType}}",
  side_upload_note: "PNG or JPG — clear, flat, all corners visible",
  side_captured: "Captured",
  side_front_preview: "Front — preview",
  side_back_preview: "Back — preview",
  side_download_front: "Download front",
  side_download_back: "Download back",

  // ── Quality panel ─────────────────────────────────────────────────────────────
  quality_empty: "Quality analysis will appear after capture.",
  quality_good: "Good for OCR",
  quality_needs_improvement: "Needs improvement",
  quality_resolution: "Resolution",
  quality_brightness: "Brightness",
  quality_contrast: "Contrast",
  quality_blur: "Blur score",
  quality_glare: "Glare ratio",

  // ── OCR step ──────────────────────────────────────────────────────────────────
  ocr_title: "Review extracted data",
  ocr_subtitle:
    "Check and correct the fields below. All fields except Middle name are required.",
  ocr_field_first: "First name",
  ocr_field_middle: "Middle name",
  ocr_field_last: "Last name",
  ocr_field_email: "Email",
  ocr_field_address: "Address",
  ocr_field_doc_number: "Document number",
  ocr_field_nationality: "Nationality",
  ocr_field_birth: "Birth date",
  ocr_field_expiry: "Expiry date",
  ocr_field_gender: "Gender",
  ocr_optional: "(optional)",
  ocr_select: "— Select —",
  ocr_male: "Male",
  ocr_female: "Female",
  ocr_error_required: "{{field}} is required",
  ocr_error_gender: "Gender is required",
  ocr_error_gender_select: "Please select gender",
  ocr_mrz_na: "Not available",
  ocr_mrz_valid: "Valid",
  ocr_mrz_invalid: "Invalid or partial",
  ocr_label_ocr: "OCR:",
  ocr_label_mrz: "MRZ:",
  ocr_hide: "Hide",
  ocr_show: "Show",
  ocr_raw_suffix: "raw data",
  ocr_raw_mrz_title: "Raw MRZ",
  ocr_raw_mrz_empty: "No MRZ extracted.",
  ocr_raw_ocr_title: "Raw OCR text",
  ocr_raw_ocr_empty: "No OCR text available.",
  ocr_error_fill: "Please fill in all required fields before continuing.",
  ocr_running: "Running…",

  // ── Signature ─────────────────────────────────────────────────────────────────
  sig_title: "Signature photo",
  sig_subtitle:
    "Upload a clear photo of your handwritten signature on a white background. Accepted formats: JPG, PNG · max {{max}} MB.",
  sig_error_type: "Only JPG or PNG files are accepted.",
  sig_error_size: "File must be under {{max}} MB.",
  sig_hint_small: "Image looks very small — make sure the signature is legible.",
  sig_captured: "✓ Signature captured",
  sig_retake: "Retake / replace",
  sig_upload_title: "Click to upload signature photo",
  sig_upload_note: "JPG or PNG · max {{max}} MB",
  sig_tips_title: "Tips for a good signature photo",
  sig_tip_1: "Sign on plain white paper with a dark pen",
  sig_tip_2: "Ensure the full signature is visible with no clipping",
  sig_tip_3: "Avoid shadows, glare, and wrinkles on the paper",
  sig_tip_4: "Photograph straight-on (not at an angle)",
  sig_error_required: "Signature photo is required before continuing.",
  sig_tab_upload: "Upload photo",
  sig_tab_draw: "Draw signature",
  sig_draw_title: "Draw your signature",
  sig_draw_note: "Use your mouse or finger to sign in the box below",
  sig_draw_clear: "Clear",
  sig_draw_confirm: "Use this signature",
  sig_draw_empty: "Please draw your signature before confirming.",
  sig_trim_continue: "Trim & Continue",

  // ── Face match ────────────────────────────────────────────────────────────────
  match_title: "Face match result",
  match_subtitle:
    "Your selfie is compared against your document photo via server-side face recognition.",
  match_crop_selfie: "Selfie crop (224×224)",
  match_crop_doc: "Document crop (224×224)",
  match_loading: "Running crop detection…",
  match_passed: "Match passed",
  match_review: "Review needed",
  match_similarity: "Similarity",
  match_confidence: "Confidence",
  match_threshold: "Threshold",
  match_doc_aligned: "Doc aligned",
  match_photo_aligned: "Photo aligned",
  match_no_result: "No match result yet.",
  match_error: "Error",
  match_submitting: "Submitting…",
  match_submit: "Submit Registration",
  match_success_title: "Thank You!",
  match_success_desc:
    "Your registration has been submitted successfully. We will review your information and get back to you shortly.",
  match_btn_new: "Start New Registration",
  match_error_submit: "Submission failed. Please try again.",

  // ── Review ────────────────────────────────────────────────────────────────────
  review_title: "Review & submit",
  review_subtitle: "Confirm the data below before sending to the backend.",
  review_error_session:
    "Session expired. Please restart the flow and verify your number again.",
  review_error_unexpected: "Unexpected error occurred.",
  review_payload_title: "Payload to be sent",
  review_debug_title: "Internal payload (debug)",
  review_success_title: "Thank you!",
  review_success_desc: "Your SIM registration has been submitted successfully.",
  review_btn_new: "Start a new registration",
  review_btn_download: "Download JSON",
  review_sending: "Sending…",
  review_resend: "Sent — resend?",
  review_btn_submit: "Submit registration",
  review_btn_restart: "Restart",
};

const fr: typeof en = {
  // ── Common ──────────────────────────────────────────────────────────────────
  back: "Retour",
  continue: "Continuer",
  next: "Suivant",
  done: "Terminé",
  locked: "Verrouillé",

  // ── Header ──────────────────────────────────────────────────────────────────
  header_subtitle: "Auto-inscription",
  header_title: "Enregistrement KYC",

  // ── Stepper ──────────────────────────────────────────────────────────────────
  stepper_goto: "Aller à {{label}}",
  stepper_counter: "Étape {{current}} sur {{total}}",

  // ── Step labels ───────────────────────────────────────────────────────────────
  step_msisdn: "Numéro mobile",
  step_consent: "Consentement",
  step_selfie: "Selfie & Vivacité",
  step_document: "Capture document",
  step_ocr: "OCR & MRZ",
  step_signature: "Signature",
  step_match: "Correspondance",

  // ── MSISDN ────────────────────────────────────────────────────────────────────
  msisdn_title: "Vérifiez votre numéro",
  msisdn_subtitle_otp: "Nous avons envoyé un code à votre numéro.",
  msisdn_subtitle_idle: "Entrez votre numéro de téléphone pour commencer.",
  msisdn_label: "Numéro de téléphone",
  msisdn_error_invalid:
    "Entrez un numéro international valide (ex: +243970000001)",
  msisdn_error_registered: "Ce numéro est déjà enregistré.",
  msisdn_error_captcha:
    "La vérification de sécurité n'est pas prête. Veuillez patienter.",
  msisdn_error_send:
    "Échec de l'envoi du code de vérification. Veuillez réessayer.",
  msisdn_sending: "Envoi du code…",
  msisdn_send: "Envoyer le code de vérification →",
  msisdn_code_sent: "Code envoyé au {{phone}}",
  msisdn_change: "Changer de numéro",
  msisdn_error_resend: "Échec de renvoi du code. Veuillez réessayer.",
  msisdn_recaptcha: "Protégé par reCAPTCHA —",
  msisdn_privacy: "Confidentialité",
  msisdn_terms: "Conditions",

  // ── OTP ───────────────────────────────────────────────────────────────────────
  otp_label: "Entrez le code à {{count}} chiffres.",
  otp_verifying: "Vérification…",
  otp_verify: "Vérifier le code",
  otp_no_receive: "Vous ne l'avez pas reçu ?",
  otp_resend: "Renvoyer le code",
  otp_wait: "Vous ne l'avez pas reçu ? Attendez le minuteur pour renvoyer.",
  otp_attempts_remaining_one: "{{count}} tentative restante",
  otp_attempts_remaining_other: "{{count}} tentatives restantes",

  // ── Consent ───────────────────────────────────────────────────────────────────
  consent_title: "Consentement et confidentialité",
  consent_desc_1:
    "En continuant, vous acceptez d'utiliser ce portail sécurisé pour compléter l'enregistrement de votre carte SIM à distance.",
  consent_desc_2:
    "Ce processus garantit la conformité et prévient la fraude grâce à la validation et aux contrôles de vivacité.",
  consent_checkbox:
    "J'accepte la capture biométrique et le traitement des documents pour la vérification d'identité.",
  consent_models_loading:
    "Chargement des modèles de reconnaissance faciale, veuillez patienter…",

  // ── Selfie ────────────────────────────────────────────────────────────────────
  selfie_title: "Selfie et contrôle de vivacité",
  selfie_detecting: "Positionnez votre visage dans le cadre pour commencer.",
  selfie_ready_phase: "Visage détecté ! Prêt à commencer le défi.",
  selfie_challenging: "Défi {{index}} sur {{total}}",
  selfie_timeout_phase: "Le délai du défi est expiré.",
  selfie_done_phase: "Vivacité vérifiée — capture des photos en cours.",
  selfie_front_guide:
    "La capture automatique commencera quand votre visage sera prêt.",
  selfie_front_countdown: "Capture dans {{count}}s — restez immobile !",
  selfie_front_captured_phase: "Photo frontale capturée !",
  selfie_side_guide_phase: "Tournez la tête pour capturer le profil.",
  selfie_side_ready_phase:
    "Parfait ! Appuyez pour prendre la photo de profil.",
  selfie_complete: "Tout est prêt ! Passage à l'étape suivante…",
  selfie_badge_side: "Étape 2 / 2 — Profil",
  selfie_badge_front: "Étape 1 / 2 — Face",
  selfie_badge_liveness: "Vivacité vérifiée",
  selfie_badge_challenge: "Défi {{index}} / {{total}}",
  selfie_detecting_face: "Détection du visage…",
  selfie_face_title: "Visage détecté !",
  selfie_ready_desc:
    "Vous aurez {{count}} défis rapides. Chacun a 10 secondes. Prêt ?",
  selfie_btn_ready: "Je suis prêt →",
  selfie_challenge_label: "Défi {{index}} sur {{total}}",
  selfie_timeout_title: "Temps écoulé !",
  selfie_timeout_desc:
    "Vous n'avez pas complété le défi à temps. Réessayons.",
  selfie_btn_retry: "Réessayer les défis →",
  selfie_btn_manual: "Capture manuelle",
  selfie_btn_capture_side: "Capturer le profil",
  selfie_btn_turn_unlock: "Tournez davantage pour déverrouiller →",
  selfie_challenge_progress: "Progression des défis",
  selfie_photo_guide: "Guide photo",
  selfie_front_photo: "Photo frontale",
  selfie_front_desc:
    "Faites face à la caméra. La capture automatique commence quand la qualité est bonne.",
  selfie_side_photo: "Photo de profil",
  selfie_side_desc:
    "Tournez lentement la tête à droite. Le bouton s'active quand l'angle est bon.",
  selfie_turn_angle: "Angle de rotation",
  selfie_captured: "Capturé",
  selfie_front_label: "Face",
  selfie_side_label: "Profil",
  selfie_btn_retake: "Reprendre les photos",
  selfie_auto_capturing: "Capture automatique…",
  selfie_complete_liveness: "Complétez la vivacité d'abord",
  selfie_turn_head: "Tournez la tête pour déverrouiller →",

  // ── Status banner ─────────────────────────────────────────────────────────────
  banner_position:
    "Positionnez votre visage dans l'ovale pour démarrer la capture",
  banner_closer:
    "Visage détecté — rapprochez-vous un peu pour une meilleure qualité",
  banner_hold: "Restez immobile — démarrage de la capture…",
  banner_countdown:
    "Capture dans {{count}}… restez immobile et regardez la caméra",
  banner_front_captured:
    "Photo frontale capturée ! Préparation de la photo de profil…",
  banner_side_title: "Prenez maintenant une photo de profil",
  banner_side_hint:
    "Tournez lentement la tête à droite jusqu'à ce que l'indicateur se remplisse",
  banner_side_ready: "Angle parfait ! Appuyez pour capturer.",
  banner_all_captured: "Toutes les photos capturées ! Poursuite…",

  // ── Document ──────────────────────────────────────────────────────────────────
  doc_title: "Capture de document",
  doc_subtitle:
    "Choisissez votre type de document, puis capturez ou téléchargez des photos claires.",
  doc_type_label: "Type de document",
  doc_passport: "Passeport",
  doc_national_id: "Carte d’Électeur",
  doc_drivers: "Permis de conduire",
  doc_hint_passport:
    "Ouvrez à la page photo/données. Assurez-vous que la MRZ (deux lignes en bas) est entièrement visible.",
  doc_hint_national_id:
    "Capturez d'abord le recto, puis le verso. Assurez-vous que les quatre coins sont visibles.",
  doc_hint_drivers:
    "Capturez d'abord le recto, puis le verso. Tenez la carte à plat pour éviter les reflets.",
  doc_passport_guide: "Comment capturer votre passeport",
  doc_step_1: "Ouvrez votre passeport à la page photo/données.",
  doc_step_2: "Posez-le à plat sur une surface sombre bien éclairée.",
  doc_step_3: "Les quatre coins de la page doivent être visibles.",
  doc_step_4:
    "Assurez-vous que la MRZ (deux lignes en bas) est entièrement lisible.",
  doc_step_5: "Évitez les reflets, les ombres et les obstructions.",
  doc_camera: "Caméra",
  doc_upload: "Télécharger",
  doc_btn_ocr: "Lancer OCR & MRZ",
  doc_btn_ocr_running: "OCR en cours…",
  doc_hint_front: "Capturez ou téléchargez le recto pour continuer.",
  doc_hint_back: "Capturez ou téléchargez le verso pour continuer.",
  doc_front_captured: "Recto capturé",
  doc_back_captured: "Verso capturé",

  // ── Document side ─────────────────────────────────────────────────────────────
  side_front_heading: "Recto",
  side_back_heading: "Verso",
  side_front_capture: "Capturer le recto",
  side_back_capture: "Capturer le verso",
  side_align: "Alignez le document dans le cadre",
  side_upload_prompt: "Télécharger {{side}} de {{docType}}",
  side_upload_note: "PNG ou JPG — clair, plat, coins visibles",
  side_captured: "Capturé",
  side_front_preview: "Recto — aperçu",
  side_back_preview: "Verso — aperçu",
  side_download_front: "Télécharger recto",
  side_download_back: "Télécharger verso",

  // ── Quality panel ─────────────────────────────────────────────────────────────
  quality_empty: "L'analyse de qualité apparaîtra après la capture.",
  quality_good: "Bon pour l'OCR",
  quality_needs_improvement: "À améliorer",
  quality_resolution: "Résolution",
  quality_brightness: "Luminosité",
  quality_contrast: "Contraste",
  quality_blur: "Score de flou",
  quality_glare: "Ratio de reflet",

  // ── OCR step ──────────────────────────────────────────────────────────────────
  ocr_title: "Vérifiez les données extraites",
  ocr_subtitle:
    "Vérifiez et corrigez les champs ci-dessous. Tous les champs sauf le deuxième prénom sont obligatoires.",
  ocr_field_first: "Prénom",
  ocr_field_middle: "Deuxième prénom",
  ocr_field_last: "Nom de famille",
  ocr_field_email: "Email",
  ocr_field_address: "Adresse",
  ocr_field_doc_number: "Numéro de document",
  ocr_field_nationality: "Nationalité",
  ocr_field_birth: "Date de naissance",
  ocr_field_expiry: "Date d'expiration",
  ocr_field_gender: "Genre",
  ocr_optional: "(optionnel)",
  ocr_select: "— Sélectionner —",
  ocr_male: "Homme",
  ocr_female: "Femme",
  ocr_error_required: "{{field}} est obligatoire",
  ocr_error_gender: "Le genre est obligatoire",
  ocr_error_gender_select: "Veuillez sélectionner le genre",
  ocr_mrz_na: "Non disponible",
  ocr_mrz_valid: "Valide",
  ocr_mrz_invalid: "Invalide ou partiel",
  ocr_label_ocr: "OCR :",
  ocr_label_mrz: "MRZ :",
  ocr_hide: "Masquer",
  ocr_show: "Afficher",
  ocr_raw_suffix: "données brutes",
  ocr_raw_mrz_title: "MRZ brut",
  ocr_raw_mrz_empty: "Aucune MRZ extraite.",
  ocr_raw_ocr_title: "Texte OCR brut",
  ocr_raw_ocr_empty: "Aucun texte OCR disponible.",
  ocr_error_fill:
    "Veuillez remplir tous les champs obligatoires avant de continuer.",
  ocr_running: "En cours…",

  // ── Signature ─────────────────────────────────────────────────────────────────
  sig_title: "Photo de signature",
  sig_subtitle:
    "Téléchargez une photo claire de votre signature manuscrite sur fond blanc. Formats acceptés : JPG, PNG · max {{max}} Mo.",
  sig_error_type: "Seuls les fichiers JPG ou PNG sont acceptés.",
  sig_error_size: "Le fichier doit faire moins de {{max}} Mo.",
  sig_hint_small:
    "L'image semble très petite — assurez-vous que la signature est lisible.",
  sig_captured: "✓ Signature capturée",
  sig_retake: "Reprendre / remplacer",
  sig_upload_title: "Cliquez pour télécharger la photo de signature",
  sig_upload_note: "JPG ou PNG · max {{max}} Mo",
  sig_tips_title: "Conseils pour une bonne photo de signature",
  sig_tip_1: "Signez sur du papier blanc avec un stylo foncé",
  sig_tip_2: "Assurez-vous que la signature complète est visible",
  sig_tip_3: "Évitez les ombres, les reflets et les plis sur le papier",
  sig_tip_4: "Photographiez de face (pas en biais)",
  sig_error_required:
    "La photo de signature est obligatoire pour continuer.",
  sig_tab_upload: "Télécharger une photo",
  sig_tab_draw: "Dessiner la signature",
  sig_draw_title: "Dessinez votre signature",
  sig_draw_note: "Utilisez votre souris ou votre doigt pour signer dans le cadre ci-dessous",
  sig_draw_clear: "Effacer",
  sig_draw_confirm: "Utiliser cette signature",
  sig_draw_empty: "Veuillez dessiner votre signature avant de confirmer.",
  sig_trim_continue: "Recadrer et continuer",

  // ── Face match ────────────────────────────────────────────────────────────────
  match_title: "Résultat de correspondance faciale",
  match_subtitle:
    "Votre selfie est comparé à la photo de votre document via la reconnaissance faciale côté serveur.",
  match_crop_selfie: "Recadrage selfie (224×224)",
  match_crop_doc: "Recadrage document (224×224)",
  match_loading: "Détection du recadrage en cours…",
  match_passed: "Correspondance réussie",
  match_review: "Révision nécessaire",
  match_similarity: "Similarité",
  match_confidence: "Confiance",
  match_threshold: "Seuil",
  match_doc_aligned: "Doc aligné",
  match_photo_aligned: "Photo alignée",
  match_no_result: "Aucun résultat de correspondance.",
  match_error: "Erreur",
  match_submitting: "Envoi…",
  match_submit: "Soumettre l'inscription",
  match_success_title: "Merci !",
  match_success_desc:
    "Votre inscription a été soumise avec succès. Nous examinerons vos informations et vous contacterons rapidement.",
  match_btn_new: "Nouvelle inscription",
  match_error_submit: "L'envoi a échoué. Veuillez réessayer.",

  // ── Review ────────────────────────────────────────────────────────────────────
  review_title: "Vérifier et soumettre",
  review_subtitle: "Confirmez les données ci-dessous avant d'envoyer.",
  review_error_session:
    "Session expirée. Veuillez redémarrer le flux et vérifier votre numéro.",
  review_error_unexpected: "Une erreur inattendue s'est produite.",
  review_payload_title: "Données à envoyer",
  review_debug_title: "Données internes (débogage)",
  review_success_title: "Merci !",
  review_success_desc:
    "Votre inscription SIM a été soumise avec succès.",
  review_btn_new: "Nouvelle inscription",
  review_btn_download: "Télécharger JSON",
  review_sending: "Envoi…",
  review_resend: "Envoyé — renvoyer ?",
  review_btn_submit: "Soumettre l'inscription",
  review_btn_restart: "Recommencer",
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    debug: false,
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
  });

export default i18n;
