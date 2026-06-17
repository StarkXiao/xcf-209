import type { CaseMailSystem, CasePhase, Mail, Document, MailDeliveryEvent } from '@/types'

export function createInitialIntelligenceState() {
  return {
    currentPhaseId: null,
    completedPhases: [],
    readMails: [],
    readDocuments: [],
    totalIntelligence: 0,
    phaseIntelligence: {},
    sceneUnlockProgress: {},
    deductionInfoCompleteness: 0,
    mailNotifications: [],
    documentNotifications: [],
    history: []
  }
}

export const caseMailSystems: Record<string, CaseMailSystem> = {
  'case-001': {
    caseId: 'case-001',
    phases: [
      {
        id: 'phase-1',
        name: '初步调查',
        description: '接到报案，开始收集基本信息，了解案件背景。',
        phaseNumber: 1,
        unlockCondition: { type: 'manual' },
        unlockedScenes: ['scene-lighthouse', 'scene-cottage'],
        unlockedClues: [],
        unlockedEvidence: [],
        unlockedMails: ['mail-001', 'mail-002'],
        unlockedDocuments: ['doc-001', 'doc-002'],
        isActive: true,
        isCompleted: false,
        intelligenceLevel: 25
      },
      {
        id: 'phase-2',
        name: '深入调查',
        description: '发现关键线索，开始深入调查守望者的背景和神秘组织。',
        phaseNumber: 2,
        unlockCondition: {
          type: 'evidence_discovered',
          requiredIds: ['evidence-diary', 'evidence-letter'],
          requiredCount: 2
        },
        unlockedScenes: ['scene-shore'],
        unlockedClues: ['clue-call', 'clue-organization'],
        unlockedEvidence: ['evidence-hidden-mark', 'evidence-locked-drawer'],
        unlockedMails: ['mail-003', 'mail-004', 'mail-005'],
        unlockedDocuments: ['doc-003', 'doc-004'],
        isActive: false,
        isCompleted: false,
        intelligenceLevel: 50
      },
      {
        id: 'phase-3',
        name: '真相揭露',
        description: '掌握足够证据，揭示案件的真正真相，面对深渊。',
        phaseNumber: 3,
        unlockCondition: {
          type: 'clue_analyzed',
          requiredIds: ['clue-call', 'clue-organization', 'clue-awakening'],
          requiredCount: 3
        },
        unlockedScenes: [],
        unlockedClues: ['clue-entity', 'clue-deep-one'],
        unlockedEvidence: ['evidence-whisper', 'evidence-deep-statue'],
        unlockedMails: ['mail-006', 'mail-007'],
        unlockedDocuments: ['doc-005', 'doc-006'],
        isActive: false,
        isCompleted: false,
        intelligenceLevel: 75
      },
      {
        id: 'phase-4',
        name: '最终抉择',
        description: '所有证据已收集完毕，必须做出最终判断，决定案件的结局。',
        phaseNumber: 4,
        unlockCondition: {
          type: 'evidence_discovered',
          requiredIds: ['evidence-whisper', 'evidence-hidden-mark', 'evidence-locked-drawer'],
          requiredCount: 3
        },
        unlockedScenes: [],
        unlockedClues: [],
        unlockedEvidence: [],
        unlockedMails: ['mail-008'],
        unlockedDocuments: ['doc-007'],
        isActive: false,
        isCompleted: false,
        intelligenceLevel: 100
      }
    ],
    mails: [
      {
        id: 'mail-001',
        caseId: 'case-001',
        subject: '【紧急】黑石岛失踪案',
        sender: '警察局局长',
        senderTitle: '马什波特镇警察局',
        recipient: '调查员',
        content: `调查员你好，

这是一封紧急案件委托。昨夜，黑石岛灯塔的守望者——老托马斯·格里尔——离奇失踪了。

当地渔民报告称，昨晚灯塔发出了诡异的紫光，并且有人听到了令人毛骨悚然的低语声。我们已经派人前往初步勘察，但现场情况...有些异常。

我需要你立刻前往黑石岛展开调查。这可能不是一起普通的失踪案。

案件档案已附在下方，请查阅。

注意：灯塔区域可能存在未知危险，请保持警惕。

祝好运，
警察局局长 哈罗德·米勒`,
        attachments: [
          {
            id: 'attach-001',
            name: '案件初步报告',
            type: 'document',
            referenceId: 'doc-001',
            description: '警方初步勘察报告'
          }
        ],
        sentAt: Date.now() - 86400000,
        isRead: false,
        isImportant: true,
        sanityEffect: 0,
        phaseId: 'phase-1',
        intelligenceValue: 10,
        tags: ['紧急', '案件委托']
      },
      {
        id: 'mail-002',
        caseId: 'case-001',
        subject: '关于黑石岛的背景资料',
        sender: '档案室',
        senderTitle: '调查局资料科',
        recipient: '调查员',
        content: `调查员，

收到你即将调查黑石岛案件的通知，我整理了一些关于该岛的背景资料供你参考。

黑石岛位于马什波特镇外海约12海里，岛上仅有一座灯塔和守塔人的小屋。该岛历史上就有各种诡异传闻，渔民们普遍认为那是个不祥之地。

值得注意的是，1892年、1907年和1921年，岛上的三任守塔人都先后失踪，官方记录均为"意外坠海"。但民间流传着更可怕的说法...

我还找到了一份旧报纸剪报，你可能会感兴趣。

另外，现任守塔人格里尔在两个月前曾向镇公所申请过调职，但被驳回了。

祝你调查顺利。

档案室 艾琳`,
        attachments: [
          {
            id: 'attach-002',
            name: '旧报纸剪报',
            type: 'document',
            referenceId: 'doc-002',
            description: '1921年失踪案报道'
          }
        ],
        sentAt: Date.now() - 82800000,
        isRead: false,
        isImportant: false,
        sanityEffect: -3,
        phaseId: 'phase-1',
        intelligenceValue: 15,
        hiddenClues: ['clue-organization'],
        tags: ['背景资料', '历史']
      },
      {
        id: 'mail-003',
        caseId: 'case-001',
        subject: '【加密】关于"深海研究协会"',
        sender: '情报科',
        senderTitle: '机密',
        recipient: '调查员',
        content: `[机密等级：B]

调查员，

根据你在调查中发现的"深海研究协会"信件，我们进行了数据库比对。

这个组织非常神秘。表面上是一个海洋生物学研究机构，但我们的记录显示，它与多起超自然事件有关联。1928年，该协会曾资助过一支前往南极的探险队，但那支队伍再也没有回来。

协会的现任会长是一个名叫奥贝德·马什的人。这个名字...如果你熟悉马什波特镇的历史，应该知道这个姓氏代表什么。

注意：这个组织可能具有危险性，建议谨慎接触。

如果你发现更多关于该组织的线索，请立即上报。

情报科 代号：渡鸦`,
        attachments: [],
        sentAt: Date.now() - 43200000,
        isRead: false,
        isImportant: true,
        sanityEffect: -5,
        phaseId: 'phase-2',
        intelligenceValue: 20,
        unlocksScenes: ['scene-shore'],
        hiddenClues: ['clue-organization'],
        tags: ['机密', '组织调查']
      },
      {
        id: 'mail-004',
        caseId: 'case-001',
        subject: '守望者的医疗记录',
        sender: '镇医院',
        senderTitle: '马什波特镇立医院',
        recipient: '调查员',
        content: `调查员您好，

根据警方要求，我们提供了托马斯·格里尔的医疗记录。

格里尔先生近年来的健康状况每况愈下，尤其是他的精神状态。他多次抱怨"听到海里有人在叫他的名字"，并且经常做噩梦。我们给他开了一些镇静剂，但效果不佳。

三个月前，他曾来医院说他"看到了不属于这个世界的东西"，但我们检查后没有发现任何器质性病变。

值得注意的是，他的家族似乎有精神病史。他的祖父和父亲都在晚年出现了严重的精神问题。

如果需要更多信息，请随时联系我们。

马什波特镇立医院 档案室`,
        attachments: [
          {
            id: 'attach-003',
            name: '医疗记录摘要',
            type: 'document',
            referenceId: 'doc-003',
            description: '托马斯·格里尔的医疗档案'
          }
        ],
        sentAt: Date.now() - 36000000,
        isRead: false,
        isImportant: false,
        sanityEffect: -3,
        phaseId: 'phase-2',
        intelligenceValue: 15,
        hiddenClues: ['clue-awakening'],
        tags: ['医疗', '背景']
      },
      {
        id: 'mail-005',
        caseId: 'case-001',
        subject: '来自同事的警告',
        sender: '弗朗西斯·摩根',
        senderTitle: '资深调查员',
        recipient: '调查员',
        content: `学弟/学妹，

听说你接手了黑石岛的案子。作为曾经调查过类似案件的前辈，我必须警告你——

这个案子远比表面看起来的危险。我在1925年曾调查过一起类似的海上失踪案，最后...有些事情我至今无法理解。

相信我，当你在海边看到"不该存在的东西"时，不要试图去理解，立刻转身离开。

如果你发现了任何刻有螺旋图案的东西，不要碰，不要看，上报给局里的"特殊部门"。

另外，注意你的理智。有些真相，人类不该知晓。

如果遇到无法解释的事情，可以联系我。

保重。

弗朗西斯·摩根`,
        attachments: [],
        sentAt: Date.now() - 28800000,
        isRead: false,
        isImportant: true,
        sanityEffect: -8,
        phaseId: 'phase-2',
        intelligenceValue: 25,
        hiddenEvidence: ['evidence-whisper'],
        tags: ['警告', '经验之谈']
      },
      {
        id: 'mail-006',
        caseId: 'case-001',
        subject: '【紧急】深渊低语录音分析报告',
        sender: '声学分析科',
        senderTitle: '技术分析部',
        recipient: '调查员',
        content: `调查员，

我们分析了你提交的那段"诡异低语"录音，结果...令人不安。

首先，这段音频中包含的频率不在人类正常听觉范围内，但确实存在。我们使用特殊设备解析后，发现那是一种有规律的语言模式，但不属于任何已知的人类语言。

更可怕的是，我们的一名分析师在反复听了这段录音后，开始出现严重的头痛和幻觉，声称"那些声音在对我说话"。他目前正在接受心理评估。

我们在音频中识别出了几个重复出现的词汇：
- "Ph'nglui"
- "mglw'nafh"
- "Cthulhu"
- "R'lyeh"

这些词汇让我想起了一些古老的传说...

建议：不要反复收听这段录音。如果你必须分析，请使用设备，不要用耳朵直接听。

另外，如果你能找到更多关于"达贡"和"深潜者"的信息，或许能解开这个谜团。

声学分析科 理查德·波因德克斯特`,
        attachments: [
          {
            id: 'attach-004',
            name: '音频频谱分析图',
            type: 'document',
            referenceId: 'doc-005',
            description: '低语录音的技术分析'
          }
        ],
        sentAt: Date.now() - 14400000,
        isRead: false,
        isImportant: true,
        sanityEffect: -10,
        phaseId: 'phase-3',
        intelligenceValue: 30,
        hiddenClues: ['clue-call-of-deep', 'clue-entity'],
        tags: ['技术分析', '超自然']
      },
      {
        id: 'mail-007',
        caseId: 'case-001',
        subject: '关于那个雕像...',
        sender: '考古学教授',
        senderTitle: '密斯卡托尼克大学',
        recipient: '调查员',
        content: `亲爱的调查员，

我从一位同事那里听说了你发现的那个"海底雕像"。作为研究古代地中海文明的考古学家，我对此非常感兴趣。

根据你的描述，那个雕像描绘的是一个有着章鱼头部和人类躯体的存在。这让我想起了一些非常古老的、被主流学术界视为"伪史"的传说。

在某些被遗忘的典籍中，曾提到过一个名为"克苏鲁"的古老存在，据说它沉睡在太平洋深处的拉莱耶城中。还有关于"深潜者"和"达贡"的记载——那是一种半人半鱼的生物，据说至今仍在某些偏僻的海岸附近活动。

如果你能让我亲眼看看那个雕像，我也许能提供更多信息。

另外，如果你在调查中发现任何写有"非人类文字"的东西，千万不要尝试去读它。

亨利·阿米蒂奇教授
密斯卡托尼克大学`,
        attachments: [
          {
            id: 'attach-005',
            name: '古代传说参考文献',
            type: 'document',
            referenceId: 'doc-006',
            description: '关于深海古神的传说记载'
          }
        ],
        sentAt: Date.now() - 7200000,
        isRead: false,
        isImportant: true,
        sanityEffect: -12,
        phaseId: 'phase-3',
        intelligenceValue: 35,
        hiddenClues: ['clue-entity', 'clue-creature'],
        tags: ['考古', '神话传说']
      },
      {
        id: 'mail-008',
        caseId: 'case-001',
        subject: '【最终通知】案件结案期限',
        sender: '总部',
        senderTitle: '调查总局',
        recipient: '调查员',
        content: `调查员，

关于黑石岛失踪案，总部要求你在48小时内提交最终调查报告。

根据我们收到的进度报告，你已经收集了相当多的证据。现在是时候做出判断了。

请注意：
1. 你的结论将决定案件的最终走向
2. 不同的结论会产生不同的后续影响
3. 请谨慎权衡你所掌握的所有信息

另外，我们收到情报，"深海研究协会"似乎已经注意到你的调查。请加快进度，注意安全。

我们相信你的判断。

调查总局 案件管理处`,
        attachments: [],
        sentAt: Date.now() - 3600000,
        isRead: false,
        isImportant: true,
        sanityEffect: -5,
        phaseId: 'phase-4',
        intelligenceValue: 10,
        replyOptions: [
          {
            id: 'reply-1',
            text: '我将尽快提交报告，结论倾向于他杀可能性',
            nextMailId: 'mail-009',
            effect: {
              sanity: -3,
              intelligenceBonus: 5
            }
          },
          {
            id: 'reply-2',
            text: '请求延长调查时间，还有一些疑点需要核实',
            nextMailId: 'mail-010',
            effect: {
              sanity: -5,
              intelligenceBonus: 15
            }
          },
          {
            id: 'reply-3',
            text: '这个案件...可能涉及超自然因素，需要特殊部门介入',
            nextMailId: 'mail-011',
            effect: {
              sanity: -10,
              unlockClues: ['clue-deep-one']
            }
          }
        ],
        tags: ['结案', '总部通知']
      }
    ],
    documents: [
      {
        id: 'doc-001',
        caseId: 'case-001',
        title: '黑石岛失踪案初步勘察报告',
        type: 'report',
        author: '警官 詹姆斯·威尔逊',
        date: '1932年10月15日',
        content: '',
        pages: [
          {
            id: 'doc-001-page-1',
            pageNumber: 1,
            content: `# 黑石岛失踪案初步勘察报告

## 案件基本信息
- 报案时间：1932年10月15日 06:30
- 报案人：渔民 罗伯特·卡特
- 失踪者：托马斯·格里尔（男，58岁，黑石岛灯塔守望者）
- 最后目击：1932年10月14日 18:00，由最后一班渡轮船员目击

## 现场初步勘察

### 灯塔内部
- 灯塔大门半开，门锁完好，无撬动痕迹
- 守望者日志摊开在桌上，最后几页字迹潦草难以辨认
- 桌上有半杯已经冷却的茶，无异味
- 墙壁上发现一些奇怪的刻痕，呈螺旋状分布

### 小屋内部
- 屋内一片狼藉，桌椅翻倒，仿佛发生过激烈挣扎
- 床上被褥凌乱，但失踪者衣物仍在衣柜中
- 书桌上发现一封来自"深海研究协会"的信件
- 壁炉内有焚烧过的纸张灰烬

## 初步判断
案件性质不明，不排除他杀可能，但现场无明显血迹。
建议派遣专业调查员进一步勘察。`,
            isUnlocked: true
          }
        ],
        isRead: false,
        isClassified: false,
        phaseId: 'phase-1',
        intelligenceValue: 10,
        tags: ['警方报告', '初步勘察']
      },
      {
        id: 'doc-002',
        caseId: 'case-001',
        title: '马什波特公报 1921年8月12日',
        type: 'newspaper',
        author: '马什波特公报',
        date: '1921年8月12日',
        content: '',
        pages: [
          {
            id: 'doc-002-page-1',
            pageNumber: 1,
            content: `# 马什波特公报

## 第三任守塔人神秘失踪！

**本报特约记者 报道**

黑石岛灯塔再次笼罩在诡异的阴影中。昨日清晨，渔民发现灯塔彻夜未亮，登岛后发现守塔人以西结·霍尔特已不见踪影。

这是自1892年以来，该岛发生的第三起守塔人失踪事件。前两起案件均以"意外坠海"草草结案，但当地渔民中流传着更可怕的说法。

"那地方被诅咒了，"一位不愿透露姓名的老渔民说，"夜里经常能听到从岛上传来奇怪的声音，像是有人在...吟唱。"

据了解，霍尔特先生在失踪前一周曾告诉朋友，他"看到了不该看的东西"，并申请调职。镇公所尚未对此做出回应。

目前警方正在展开调查，但有消息称，当局可能会以"精神错乱导致的意外"结案。

本报将持续关注此事。`,
            isUnlocked: true
          },
          {
            id: 'doc-002-page-2',
            pageNumber: 2,
            content: `## 历史回顾：黑石岛的诅咒？

黑石岛的历史充满了不祥的记录。

- 1692年：岛上第一个定居者全家失踪，只留下满墙的奇怪符文
- 1821年：一艘商船在岛附近沉没，无人生还，船员尸体从未找到
- 1847年：灯塔建成，第一任守塔人在三个月后发疯
- 1892年：第二任守塔人失踪，官方记录为"坠海"
- 1907年：第三任守塔人失踪，同样被判定为"意外"
- 1921年：第四任守塔人霍尔特失踪

当地传说称，黑石岛是"深潜者"的圣地，每隔几十年就需要献祭一个人来平息它们的怒火。

当然，这些都只是迷信传说。但连续三起几乎完全相同的失踪案，确实令人感到不安。

难道真的如渔民所说，那座岛被诅咒了？`,
            isUnlocked: false,
            unlockCondition: {
              type: 'clue',
              requiredIds: ['clue-organization']
            }
          }
        ],
        isRead: false,
        isClassified: false,
        phaseId: 'phase-1',
        intelligenceValue: 15,
        sanityEffect: -5,
        hiddenClues: ['clue-awakening'],
        tags: ['历史', '报纸']
      },
      {
        id: 'doc-003',
        caseId: 'case-001',
        title: '托马斯·格里尔医疗档案摘要',
        type: 'report',
        author: '马什波特镇立医院',
        date: '1932年10月16日',
        content: '',
        pages: [
          {
            id: 'doc-003-page-1',
            pageNumber: 1,
            content: `# 医疗档案摘要

**患者姓名：** 托马斯·格里尔
**性别：** 男
**年龄：** 58岁
**职业：** 灯塔守望者
**档案编号：** MED-1928-0417

## 就诊记录

### 1928年3月15日
主诉：头痛、失眠
诊断：神经衰弱
处方：镇静剂，建议休息

### 1929年11月2日
主诉："听到奇怪的声音"
描述：患者称夜间经常听到"从海里传来的低语"，声称有人在叫他的名字。
精神评估：焦虑症状明显，建议心理咨询
处方：加强镇静剂剂量

### 1930年6月20日
主诉：噩梦频发
描述：反复梦见"巨大的眼睛从深海注视着他"，梦中有触手缠绕他的身体。
精神评估：疑似创伤后应激障碍
处方：抗焦虑药物

### 1931年12月10日
主诉：看到"幻觉"
描述：患者声称在灯塔顶部看到了"不属于这个世界的东西"，描述为"巨大的、有很多触手的阴影"。
精神评估：出现明显的幻觉症状，建议转院治疗，但患者拒绝。

### 1932年9月5日（最后一次就诊）
主诉：头痛加剧，"声音"越来越清晰
描述：患者称那些声音开始"教他说他们的话"，他提到了"Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn"这句话。
医生备注：患者精神状态严重恶化，有明显的家族精神病史。建议立即住院。`,
            isUnlocked: true
          }
        ],
        isRead: false,
        isClassified: false,
        phaseId: 'phase-2',
        intelligenceValue: 15,
        sanityEffect: -8,
        hiddenClues: ['clue-call', 'clue-entity'],
        tags: ['医疗', '背景']
      },
      {
        id: 'doc-004',
        caseId: 'case-001',
        title: '深海研究协会 机密文件',
        type: 'official',
        author: '深海研究协会',
        date: '1932年8月',
        content: '',
        pages: [
          {
            id: 'doc-004-page-1',
            pageNumber: 1,
            content: `# 深海研究协会 文件

**文件编号：** DRA-1932-0815
**机密等级：** 高
**标题：** 黑石岛"神圣仪式"执行方案

## 背景

黑石岛是我们伟大事业的关键地点。根据古老典籍记载，该岛是"父神达贡"和"母神海德拉"在地表的神圣居所之一。每隔75年，我们必须举行一次神圣的仪式，以确保深渊的祝福继续降临。

## 目标

1. 找到合适的"志愿者"作为仪式的祭品
2. 在10月15日（满月之夜）完成仪式
3. 确保"伟大的苏醒"能够顺利进行

## 人选

经过数月观察，我们认为现任守塔人托马斯·格里尔是完美的人选。他的家族有"深潜者"的血统，精神状态已经处于崩溃边缘，非常适合"接受召唤"。

## 步骤

1. 持续向他发送"召唤信号"，削弱他的精神防线
2. 向他展示"真理"，让他了解自己的真正使命
3. 在满月之夜，引导他完成"光荣的蜕变"

## 注意事项

- 仪式期间可能会有外部调查人员介入
- 如果有人调查，确保他们"了解真相"后永远保持沉默
- 任何情况下，都不能让外界知道我们的真实目的

**为了克苏鲁的荣耀！**`,
            isUnlocked: true
          }
        ],
        isRead: false,
        isClassified: true,
        classificationLevel: 3,
        phaseId: 'phase-2',
        intelligenceValue: 25,
        sanityEffect: -15,
        hiddenClues: ['clue-ritual', 'clue-awakening'],
        requiredEvidenceToRead: ['evidence-locked-drawer'],
        tags: ['机密', '组织文件']
      },
      {
        id: 'doc-005',
        caseId: 'case-001',
        title: '低语录音分析报告',
        type: 'research',
        author: '声学分析科 理查德·波因德克斯特',
        date: '1932年10月16日',
        content: '',
        pages: [
          {
            id: 'doc-005-page-1',
            pageNumber: 1,
            content: `# 技术分析报告

**分析对象：** 证据编号EV-AUDIO-001（"诡异低语"录音）
**分析日期：** 1932年10月16日
**分析师：** 理查德·波因德克斯特

## 频谱分析结果

### 频率组成
- 主频率：12-15Hz（人类听觉下限以下）
- 次声波成分：4-8Hz（与人类脑波频率重合）
- 包含大量无法解析的高频成分

### 语言模式分析
使用频谱解析软件后，我们确认这是一种结构化的语言，具有以下特征：
1. 包含大量的"kh"、"th"、"gh"等喉音
2. 句子结构似乎是"主语-宾语-谓语"
3. 识别出重复出现的词汇单元

### 识别出的词汇
- Ph'nglui（翻译：在...的家中）
- mglw'nafh（翻译：沉睡）
- Cthulhu（专有名词：神灵名称）
- R'lyeh（专有名词：地名）
- wgah'nagl（翻译：等待）
- fhtagn（翻译：将苏醒）

### 完整句子
"Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn"

**推测翻译：** "在拉莱耶的家中，沉睡的克苏鲁等待着苏醒。"

## 心理影响评估

反复收听此录音的实验对象均出现以下症状：
- 头痛、眩晕
- 持续的耳鸣
- 反复做内容相似的噩梦
- 出现"听到有人在对我说话"的幻觉

**警告：** 此录音可能具有精神污染性质，建议销毁。`,
            isUnlocked: true
          }
        ],
        isRead: false,
        isClassified: true,
        classificationLevel: 2,
        phaseId: 'phase-3',
        intelligenceValue: 30,
        sanityEffect: -15,
        hiddenClues: ['clue-call-of-deep', 'clue-entity'],
        requiredEvidenceToRead: ['evidence-whisper'],
        tags: ['技术分析', '超自然']
      },
      {
        id: 'doc-006',
        caseId: 'case-001',
        title: '《海底的秘密》古籍残页',
        type: 'research',
        author: '佚名',
        date: '约公元1200年',
        content: '',
        pages: [
          {
            id: 'doc-006-page-1',
            pageNumber: 1,
            content: `# 《海底的秘密》残页

（翻译自失传已久的古代典籍，译者已疯）

...在无尽的深海中，在人类无法触及的深渊，沉睡着比人类更古老的存在。

它们在人类出现之前就已存在，它们统治着这个星球的时代远早于我们。当地球还是年轻的星球时，它们就从群星之间降临。

伟大的克苏鲁，沉睡在拉莱耶的城中。父神达贡和母神海德拉，是祂的仆从和祭司。而深潜者，是祂的选民和后代。

深潜者永生不死，它们从海里来，最终回归海里。它们与人类交配，产生了半人半鱼的后代。这些后代外表看起来像人类，但随着年龄增长，会逐渐显现出祖先的特征，最终...回归大海。

当星辰归位时，拉莱耶将从海底升起，沉睡的克苏鲁将再次苏醒。那时，所有"有资格的人"都将听到召唤，回归深渊的怀抱。

那些听到召唤却拒绝的人，将陷入永恒的疯狂。那些接受召唤的人，将获得永生和荣耀。

"Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn。"

在拉莱耶的家中，沉睡的克苏鲁等待着苏醒。

...（以下内容已损毁）`,
            isUnlocked: true
          }
        ],
        isRead: false,
        isClassified: true,
        classificationLevel: 4,
        phaseId: 'phase-3',
        intelligenceValue: 35,
        sanityEffect: -20,
        hiddenClues: ['clue-entity', 'clue-deep-one', 'clue-ritual'],
        requiredEvidenceToRead: ['evidence-deep-statue'],
        tags: ['古籍', '神话', '禁忌知识']
      },
      {
        id: 'doc-007',
        caseId: 'case-001',
        title: '案件最终调查报告（草案）',
        type: 'report',
        author: '调查员',
        date: '1932年10月17日',
        content: '',
        pages: [
          {
            id: 'doc-007-page-1',
            pageNumber: 1,
            content: `# 黑石岛失踪案 最终调查报告

**案件编号：** CASE-1932-001
**调查员：** _________________
**调查周期：** 1932年10月15日 - 1932年10月17日

## 案件概述

1932年10月15日清晨，渔民罗伯特·卡特发现黑石岛灯塔彻夜未亮，登岛后发现守塔人托马斯·格里尔失踪。

## 已收集证据清单

### 第一阶段（初步调查）
1. 守望者的日记 - 揭示了精神状态的恶化
2. 神秘信件 - 来自"深海研究协会"的邀请
3. 破碎的望远镜 - 可能包含关键物证

### 第二阶段（深入调查）
4. 隐藏的印记 - 非人手印，证实非人类存在
5. 上锁的抽屉 - 包含仪式手册
6. 奇怪的符文 - 墙壁上的古老刻痕
7. 模糊的照片 - 显示出异常的轮廓

### 第三阶段（真相揭露）
8. 诡异的低语 - 录音中的非人类语言
9. 海底雕像 - 古老的克苏鲁雕像
10. 变异的死鱼 - 生物异常现象
11. 奇怪的脚印 - 非人类足迹

## 线索分析

[在此处填写你的分析...]

## 最终结论

经过全面调查，我得出以下结论：

[在此处填写你的最终结论]

**结论选项：**
□ 守望者因意外坠海身亡
□ 守望者因精神崩溃而逃离
□ 守望者被深海教团献祭，以唤醒某种古老存在
□ 守望者自愿转化为了某种深海生物
□ 守望者并非被献祭，而是回应了深海的召唤，自愿成为深潜者的一员

## 结案意见

[在此处填写结案意见...]

调查员签名：_______________
日期：___________`,
            isUnlocked: true
          }
        ],
        isRead: false,
        isClassified: false,
        phaseId: 'phase-4',
        intelligenceValue: 10,
        tags: ['结案报告', '草案']
      }
    ]
  }
}

export const mailDeliveryEvents: Record<string, MailDeliveryEvent[]> = {
  'case-001': [
    {
      mailId: 'mail-001',
      deliveredAt: Date.now() - 86400000,
      delaySeconds: 0,
      triggerCondition: { type: 'phase_started', requiredId: 'phase-1' },
      delivered: true
    },
    {
      mailId: 'mail-002',
      deliveredAt: Date.now() - 82800000,
      delaySeconds: 3600,
      triggerCondition: { type: 'phase_started', requiredId: 'phase-1' },
      delivered: true
    },
    {
      mailId: 'mail-003',
      deliveredAt: 0,
      delaySeconds: 1800,
      triggerCondition: { type: 'evidence_discovered', requiredId: 'evidence-letter' },
      delivered: false
    },
    {
      mailId: 'mail-004',
      deliveredAt: 0,
      delaySeconds: 2400,
      triggerCondition: { type: 'evidence_discovered', requiredId: 'evidence-diary' },
      delivered: false
    },
    {
      mailId: 'mail-005',
      deliveredAt: 0,
      delaySeconds: 3000,
      triggerCondition: { type: 'scene_visited', requiredId: 'scene-shore' },
      delivered: false
    },
    {
      mailId: 'mail-006',
      deliveredAt: 0,
      delaySeconds: 1200,
      triggerCondition: { type: 'evidence_discovered', requiredId: 'evidence-whisper' },
      delivered: false
    },
    {
      mailId: 'mail-007',
      deliveredAt: 0,
      delaySeconds: 1500,
      triggerCondition: { type: 'evidence_discovered', requiredId: 'evidence-deep-statue' },
      delivered: false
    },
    {
      mailId: 'mail-008',
      deliveredAt: 0,
      delaySeconds: 600,
      triggerCondition: { type: 'phase_started', requiredId: 'phase-4' },
      delivered: false
    }
  ]
}

export function getMailSystemByCaseId(caseId: string): CaseMailSystem | undefined {
  return caseMailSystems[caseId]
}

export function getMailsForPhase(caseId: string, phaseId: string): Mail[] {
  const system = caseMailSystems[caseId]
  if (!system) return []
  return system.mails.filter(m => m.phaseId === phaseId)
}

export function getDocumentsForPhase(caseId: string, phaseId: string): Document[] {
  const system = caseMailSystems[caseId]
  if (!system) return []
  return system.documents.filter(d => d.phaseId === phaseId)
}

export function getPhasesForCase(caseId: string): CasePhase[] {
  const system = caseMailSystems[caseId]
  if (!system) return []
  return system.phases.sort((a, b) => a.phaseNumber - b.phaseNumber)
}
