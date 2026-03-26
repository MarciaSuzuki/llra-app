export const DEFAULT_LANGUAGE = 'en'
export const SUPPORTED_LANGUAGES = ['en', 'pt']
export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
]

export const SPEECH_RECOGNITION_LOCALES = {
  en: 'en-US',
  pt: 'pt-BR',
}

const UI_TEXT = {
  en: {
    appName: 'Graduate Readiness Assessment',
    appNameShort: 'Graduate Readiness Assessment',
    description: 'Graduate readiness assessment for the University of the Nations',
    universityLabel: 'University of the Nations - YWAM',
    languageLabel: 'Language',
    common: {
      back: 'Back',
      continue: 'Continue',
      stop: 'Stop',
      listen: 'Listen',
      playing: 'Playing...',
      reviewed: 'Reviewed',
      notReviewedYet: 'Not reviewed yet',
      storyLabel: 'Story',
    },
    levels: {
      remember: 'Remember',
      understand: 'Understand',
      apply: 'Apply',
    },
    bands: {
      Developing: 'Developing',
      Approaching: 'Approaching',
      Meeting: 'Meeting',
      Exceeding: 'Exceeding',
    },
    inputModes: {
      audio: 'audio',
      text: 'text',
    },
    index: {
      welcomeLead: 'Before the test, you will prepare by studying two stories carefully.',
      processTitle: 'ASSESSMENT PROCESS',
      processSteps: [
        'Study both stories first. Every question in the test is based on these stories.',
        'You can read the stories and listen to them as many times as needed.',
        'You can take personal notes while preparing.',
        'During the assessment, you can listen to each question and answer by voice or text.',
      ],
      startStoryPreparation: 'Start Story Preparation',
      studyRoomTitle: 'Study room',
      studyRoomDescription: 'Read and listen carefully. You can replay each story as many times as needed. Mark both stories as reviewed to continue.',
      notesLabel: (storySubtitle) => `Optional notes for ${storySubtitle}`,
      notesPlaceholder: 'Write your notes here...',
      readyCheckbox: 'I have carefully studied this story and I am ready to be assessed on it.',
      storyStatus: (storySubtitle, isReviewed, common) => `${storySubtitle} status: ${isReviewed ? common.reviewed : common.notReviewedYet}`,
      continueToMode: 'Continue to Response Mode',
      backToStoryPreparation: 'Back to Story Preparation',
      modeTitle: 'Choose your default answer mode',
      modeDescription: 'Questions can be listened to during the test. You can answer by voice or text and switch modes later.',
      speakAnswers: 'Speak my answers',
      speakAnswersDescription: 'Use the microphone to answer.',
      typeAnswers: 'Type my answers',
      typeAnswersDescription: 'Use the keyboard to answer.',
      voiceUnavailable: 'Voice input is not available in this browser. You can continue in text mode.',
      nameTitle: 'What is your name?',
      namePlaceholder: 'Enter your full name',
      beginAssessment: 'Begin Assessment',
      loadingAssessment: 'Preparing assessment...',
    },
    assessment: {
      intro: 'Welcome, and thank you for being here. This will feel more like a conversation than an exam. We will begin by revisiting what happened in Story A, then we will explore its meaning, and finally we will connect both stories. You may listen to each question and answer by voice or text.',
      levelIntros: {
        remember: {
          title: 'First, let us revisit the story.',
          desc: 'We will start with a few questions about what happened in Story A.',
        },
        understand: {
          title: 'Now let us think about the meaning.',
          desc: 'These questions explore what Story A means.',
        },
        apply: {
          title: 'Now let us connect the two stories.',
          desc: 'These questions bring Story A and Story B together.',
        },
      },
      moveToLevel: (title, desc) => `${title} ${desc}`,
      questionPrefix: (current, total) => `Let us go to question ${current} of ${total}. `,
      complete: 'Complete',
      assessmentComplete: 'INTERVIEW COMPLETE',
      resultsReviewed: 'Your results will be reviewed by the admissions team. Thank you for your time.',
      listenCurrentQuestion: 'Listen to current question',
      autoReadOn: 'Auto-read: On',
      autoReadOff: 'Auto-read: Off',
      switchToTextMode: 'Switch to text mode',
      switchToVoiceMode: 'Switch to voice mode',
      submitAnswer: 'Send ->',
      skip: 'Skip',
      listeningNow: 'Listening... tap stop when done',
      waitForAudio: 'Please wait for audio...',
      tapMic: 'Tap microphone to speak your answer',
      voiceUnavailableSwitched: 'Voice input is not available in this browser. Switched to text input.',
      typeAnswerPlaceholder: 'Type your response here... (Enter to send)',
      finalQuestionDone: ' That was the final question. Thank you for completing the interview.',
      continueNext: ' Let us move to the next one.',
      thankYouAnswer: 'All right.',
      finishFallback: 'Thank you for completing the interview. Your responses will be reviewed by the admissions team.',
      questionCounter: (current, total) => `Q${current}/${total}`,
    },
    admin: {
      accessTitle: 'Administrator Access',
      dashboardTitle: 'Graduate Readiness Assessment Dashboard',
      enterPassword: 'Enter admin password',
      incorrectPassword: 'Incorrect password.',
      couldNotConnect: 'Could not connect. Please try again.',
      signIn: 'Sign In',
      signingIn: 'Signing in...',
      backToAssessment: 'Back to assessment',
      refresh: 'Refresh',
      assessmentLink: 'Assessment',
      totalSessions: 'Total Sessions',
      completed: 'Completed',
      averageScore: 'Avg Score',
      audioMode: 'Audio Mode',
      filters: {
        all: 'all',
        completed: 'completed',
        in_progress: 'in progress',
      },
      noSessions: 'No sessions found.',
      scoresByLevel: 'SCORES BY LEVEL',
      adminNotes: 'ADMINISTRATOR NOTES',
      recommendation: 'RECOMMENDATION (administrator decision)',
      recommendations: [
        'Recommend for admission',
        'Recommend with conditions',
        'Do not recommend at this time',
      ],
      inProgressBadge: 'In Progress',
      total: 'Total',
      modeAudio: 'audio',
      modeText: 'text',
      languageBadge: 'Language',
      sessionLanguage: (code) => code.toUpperCase(),
    },
    api: {
      evaluationStudentFallback: 'All right.',
      evaluationAdminFallback: 'Evaluation parsing failed.',
      reportStudentFallback: 'Thank you for completing the assessment. Your results will be reviewed by the admissions team.',
      reportAdminFallback: 'No qualitative analysis generated.',
      reportCompletedFallback: 'Assessment completed successfully.',
    },
  },
  pt: {
    appName: 'Avaliação de Prontidão para Pós-Graduação',
    appNameShort: 'Avaliação de Prontidão para Pós-Graduação',
    description: 'Avaliação de prontidão para pós-graduação da University of the Nations',
    universityLabel: 'University of the Nations - YWAM',
    languageLabel: 'Idioma',
    common: {
      back: 'Voltar',
      continue: 'Continuar',
      stop: 'Parar',
      listen: 'Ouvir',
      playing: 'Tocando...',
      reviewed: 'Revisada',
      notReviewedYet: 'Ainda não revisada',
      storyLabel: 'História',
    },
    levels: {
      remember: 'Lembrar',
      understand: 'Compreender',
      apply: 'Aplicar',
    },
    bands: {
      Developing: 'Em desenvolvimento',
      Approaching: 'Aproximando-se',
      Meeting: 'Atendendo',
      Exceeding: 'Superando',
    },
    inputModes: {
      audio: 'áudio',
      text: 'texto',
    },
    index: {
      welcomeLead: 'Antes do teste, você vai se preparar estudando cuidadosamente duas histórias.',
      processTitle: 'PROCESSO DA AVALIAÇÃO',
      processSteps: [
        'Estude as duas histórias primeiro. Todas as perguntas do teste são baseadas nessas histórias.',
        'Você pode ler as histórias e ouvi-las quantas vezes precisar.',
        'Você pode fazer anotações pessoais enquanto se prepara.',
        'Durante a avaliação, você pode ouvir cada pergunta e responder por voz ou por texto.',
      ],
      startStoryPreparation: 'Começar preparação com as histórias',
      studyRoomTitle: 'Sala de estudo',
      studyRoomDescription: 'Leia e ouça com atenção. Você pode repetir cada história quantas vezes precisar. Marque as duas histórias como revisadas para continuar.',
      notesLabel: (storySubtitle) => `Anotações opcionais para ${storySubtitle}`,
      notesPlaceholder: 'Escreva suas anotações aqui...',
      readyCheckbox: 'Estudei cuidadosamente esta história e estou pronto(a) para ser avaliado(a) sobre ela.',
      storyStatus: (storySubtitle, isReviewed, common) => `Status de ${storySubtitle}: ${isReviewed ? common.reviewed : common.notReviewedYet}`,
      continueToMode: 'Continuar para o modo de resposta',
      backToStoryPreparation: 'Voltar para a preparação com as histórias',
      modeTitle: 'Escolha seu modo padrão de resposta',
      modeDescription: 'As perguntas podem ser ouvidas durante o teste. Você pode responder por voz ou por texto e mudar de modo depois.',
      speakAnswers: 'Responder falando',
      speakAnswersDescription: 'Use o microfone para responder.',
      typeAnswers: 'Responder digitando',
      typeAnswersDescription: 'Use o teclado para responder.',
      voiceUnavailable: 'A entrada por voz não está disponível neste navegador. Você pode continuar no modo de texto.',
      nameTitle: 'Qual é o seu nome?',
      namePlaceholder: 'Digite seu nome completo',
      beginAssessment: 'Iniciar avaliação',
      loadingAssessment: 'Preparando avaliação...',
    },
    assessment: {
      intro: 'Olá. Obrigado por estar aqui. Esta conversa vai parecer mais uma entrevista do que uma prova. Primeiro vamos relembrar o que aconteceu na História A, depois pensar sobre o significado dela e, por fim, conectar as duas histórias. Você pode ouvir cada pergunta e responder por voz ou por texto.',
      levelIntros: {
        remember: {
          title: 'Primeiro, vamos retomar a história.',
          desc: 'Vamos começar com algumas perguntas sobre o que aconteceu na História A.',
        },
        understand: {
          title: 'Agora vamos pensar no significado.',
          desc: 'Estas perguntas exploram o que a História A quer dizer.',
        },
        apply: {
          title: 'Agora vamos conectar as duas histórias.',
          desc: 'Estas perguntas juntam a História A e a História B.',
        },
      },
      moveToLevel: (title, desc) => `${title} ${desc}`,
      questionPrefix: (current, total) => `Vamos para a pergunta ${current} de ${total}. `,
      complete: 'Concluída',
      assessmentComplete: 'ENTREVISTA CONCLUÍDA',
      resultsReviewed: 'Seus resultados serão analisados pela equipe de admissões. Obrigado pelo seu tempo.',
      listenCurrentQuestion: 'Ouvir a pergunta atual',
      autoReadOn: 'Leitura automática: Ligada',
      autoReadOff: 'Leitura automática: Desligada',
      switchToTextMode: 'Mudar para modo de texto',
      switchToVoiceMode: 'Mudar para modo de voz',
      submitAnswer: 'Enviar ->',
      skip: 'Pular',
      listeningNow: 'Ouvindo... toque em parar quando terminar',
      waitForAudio: 'Aguarde o áudio...',
      tapMic: 'Toque no microfone para falar sua resposta',
      voiceUnavailableSwitched: 'A entrada por voz não está disponível neste navegador. Mudamos para entrada por texto.',
      typeAnswerPlaceholder: 'Digite o que você quer responder... (Enter para enviar)',
      finalQuestionDone: ' Essa foi a última pergunta. Obrigado por concluir a entrevista.',
      continueNext: ' Vamos para a próxima.',
      thankYouAnswer: 'Certo.',
      finishFallback: 'Obrigado por concluir a entrevista. Suas respostas serão analisadas pela equipe de admissões.',
      questionCounter: (current, total) => `P${current}/${total}`,
    },
    admin: {
      accessTitle: 'Acesso do administrador',
      dashboardTitle: 'Painel da Avaliação de Prontidão para Pós-Graduação',
      enterPassword: 'Digite a senha do administrador',
      incorrectPassword: 'Senha incorreta.',
      couldNotConnect: 'Não foi possível conectar. Tente novamente.',
      signIn: 'Entrar',
      signingIn: 'Entrando...',
      backToAssessment: 'Voltar para a avaliação',
      refresh: 'Atualizar',
      assessmentLink: 'Avaliação',
      totalSessions: 'Total de sessões',
      completed: 'Concluídas',
      averageScore: 'Média',
      audioMode: 'Modo áudio',
      filters: {
        all: 'todas',
        completed: 'concluídas',
        in_progress: 'em andamento',
      },
      noSessions: 'Nenhuma sessão encontrada.',
      scoresByLevel: 'PONTUAÇÕES POR NÍVEL',
      adminNotes: 'NOTAS DO ADMINISTRADOR',
      recommendation: 'RECOMENDAÇÃO (decisão do administrador)',
      recommendations: [
        'Recomendar para admissão',
        'Recomendar com condições',
        'Não recomendar neste momento',
      ],
      inProgressBadge: 'Em andamento',
      total: 'Total',
      modeAudio: 'áudio',
      modeText: 'texto',
      languageBadge: 'Idioma',
      sessionLanguage: (code) => code.toUpperCase(),
    },
    api: {
      evaluationStudentFallback: 'Certo.',
      evaluationAdminFallback: 'Falha ao interpretar a avaliação.',
      reportStudentFallback: 'Obrigado por concluir a avaliação. Seus resultados serão analisados pela equipe de admissões.',
      reportAdminFallback: 'Nenhuma análise qualitativa foi gerada.',
      reportCompletedFallback: 'Avaliação concluída com sucesso.',
    },
  },
}

export function getSupportedLanguage(value) {
  if (typeof value !== 'string') return DEFAULT_LANGUAGE
  const normalized = value.trim().toLowerCase()
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : DEFAULT_LANGUAGE
}

export function getUiText(language) {
  return UI_TEXT[getSupportedLanguage(language)]
}

export function getBandLabel(band, language) {
  const text = getUiText(language)
  return text.bands[band] || band
}

export function getInputModeLabel(mode, language) {
  const text = getUiText(language)
  return text.inputModes[mode] || mode
}

export function formatSessionDate(value, language) {
  if (!value) return ''

  try {
    return new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}
