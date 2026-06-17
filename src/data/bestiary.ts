import { reactive } from 'vue'
import type { Creature, ForbiddenItem, Organization, BestiaryEntry } from '@/types'

export const creatures = reactive<Creature[]>([
  {
    id: 'creature-deep-one',
    name: '深潜者',
    category: 'creature',
    icon: '🐟',
    rarity: 'rare',
    threatLevel: 4,
    description: '来自深海的古老种族，半人半鱼的存在。据说它们与人类混血后可以在陆地上伪装生活，最终会完全转化回归大海。',
    appearance: '身高约6至7英尺，有着灰绿色的滑腻皮肤，背部有脊鳍，指间有蹼，眼球突出无法闭合，口中布满剃刀般的利齿。',
    behavior: '崇拜父神达贡与母神海德拉，居住在海底城市伊哈斯雷。周期性地登陆与沿海居民进行交易，以深海珍宝换取活人祭品。',
    abilities: ['水下呼吸', '超人力量', '心灵感应呼唤', '长生不老', '变形伪装'],
    weaknesses: ['高温火焰', '上古之印', '高浓度盐分会令其不适'],
    sightings: ['黑石岛灯塔守望者失踪案', '印斯茅斯镇大规模人口失踪事件', '南海游轮幽灵船目击'],
    sanityEffect: -12,
    firstSightedCaseId: 'case-001',
    relatedOrganizations: ['org-deep-sea-society', 'org-cult-of-dagon'],
    unlockConditions: [
      { type: 'evidence_discovered', requiredId: 'evidence-hidden-mark', description: '发现隐藏的非人印记' },
      { type: 'evidence_discovered', requiredId: 'evidence-footprints', description: '发现奇怪的脚印' }
    ],
    discovered: false,
    loreNotes: [
      '《死灵之书》记载：深潜者是不死的存在，除非遭遇暴力终结。',
      '它们的血脉可以通过人类遗传，后代外表看似正常，中年后会逐渐显现特征。',
      '信仰深潜者的人类教团承诺信徒可以获得财富与永生，但代价是最终必须回归大海。'
    ]
  },
  {
    id: 'creature-abomination-fish',
    name: '异变海鱼',
    category: 'creature',
    icon: '🐠',
    rarity: 'common',
    threatLevel: 2,
    description: '受深海力量影响而变异的普通海鱼，身上长出不属于鱼类的器官，表现出异常的攻击性。',
    appearance: '体型比同类大一至三倍，眼瞳全部朝向同一个方向——深海。部分个体长出微小的触手或额外的鳍。',
    behavior: '大规模成群出现，会主动攻击比自己大的生物。死亡后触手仍会抽动数小时。',
    abilities: ['群体攻击', '污染水源', '精神干扰'],
    weaknesses: ['离开海水迅速死亡', '高温烹饪可破坏异变细胞'],
    sightings: ['黑石海滩大量死鱼', '北极圈异常鱼群迁徙'],
    sanityEffect: -5,
    firstSightedCaseId: 'case-001',
    relatedOrganizations: [],
    unlockConditions: [
      { type: 'evidence_discovered', requiredId: 'evidence-fish', description: '调查变异死鱼' }
    ],
    discovered: false,
    loreNotes: [
      '这可能是深潜者存在的间接证据，它们的存在本身就会扭曲周边的生态。',
      '食用这种鱼的人类会做诡异的噩梦，梦中反复出现螺旋符号。'
    ]
  },
  {
    id: 'creature-shadow-thing',
    name: '影中生物',
    category: 'creature',
    icon: '👤',
    rarity: 'epic',
    threatLevel: 4,
    description: '一种寄生于二维阴影中的未知生物，只有在理智值较低时才能感知到它的存在。',
    appearance: '没有固定形态，通常表现为比周围环境更黑的斑块。在极少数目击报告中，它有太多的眼睛。',
    behavior: '长时间观察人类，似乎以精神恐惧为食。当宿主理智崩溃时会短暂地进入三维世界。',
    abilities: ['精神侵蚀', '穿越阴影', '制造幻觉', '扭曲感知'],
    weaknesses: ['强光照射', '古老的驱邪仪式'],
    sightings: ['市立图书馆地下藏书室', '精神病院患者集体幻觉报告'],
    sanityEffect: -15,
    firstSightedCaseId: 'case-002',
    relatedOrganizations: ['org-forbidden-knowledge'],
    unlockConditions: [
      { type: 'sanity_under_threshold', threshold: 30, description: '理智值降至30以下' },
      { type: 'case_completed', requiredId: 'case-002', description: '完成《暗影图书馆》案件' }
    ],
    discovered: false,
    loreNotes: [
      '有学者认为这些生物并非来自外部，而是人类潜意识深处的具象化。',
      '无论真相如何，知道它们存在这件事本身就已经很危险了。'
    ]
  },
  {
    id: 'creature-formless-spawn',
    name: '无定形之嗣',
    category: 'creature',
    icon: '🫧',
    rarity: 'legendary',
    threatLevel: 5,
    description: '来自时空之外的原初存在之仆从，拥有无限变化形态的能力，凡人直视其真容会立即疯狂。',
    appearance: '不断变换的原生质团块，其中不断浮现又消融的眼、口、触手。没有人能完整描述它的真正形态。',
    behavior: '遵循不可理解的指令行动，似乎在执行某个宏大计划的微小部分。对它而言，人类如同尘埃。',
    abilities: ['形态变化', '空间扭曲', '即时疯狂', '心灵毁灭', '物理免疫'],
    weaknesses: ['任何已知武器均无效', '或许可以被特定仪式暂时封印', '古老者的科技'],
    sightings: ['画家自杀前最后画作中出现', '北极科考队失踪事件的残留影像'],
    sanityEffect: -50,
    firstSightedCaseId: 'case-003',
    relatedOrganizations: ['org-cult-of-cthulhu', 'org-star-chamber'],
    unlockConditions: [
      { type: 'case_completed', requiredId: 'case-003', description: '完成《梦魇画作》案件' },
      { type: 'branch_unlocked', requiredId: 'standard', description: '解锁深层分支' }
    ],
    discovered: false,
    loreNotes: [
      '警告：任何试图记录此生物真容的尝试都会导致记录者精神崩溃。',
      '此条目本身就应该被视为禁忌知识的一部分。',
      '阅读这些文字的你，已经被标记了。'
    ]
  },
  {
    id: 'creature-painting-watcher',
    name: '画中守望者',
    category: 'creature',
    icon: '🖼️',
    rarity: 'rare',
    threatLevel: 3,
    description: '栖息于某些被诅咒画作中的存在，它们通过艺术媒介与我们的世界产生交集。',
    appearance: '在画中呈现不同形态，但共同点是——无论观察者站在哪个角度，它们的眼睛始终注视着你。',
    behavior: '通过梦境影响观画者，在反复出现的噩梦中逐渐侵蚀受害者的理智，最终可能将受害者拉入画中世界。',
    abilities: ['梦境入侵', '精神操控', '维度交叉', '认知扭曲'],
    weaknesses: ['销毁画作本体', '封闭在无光环境中', '反向封印仪式'],
    sightings: ['《星夜归途》系列画作收藏者连环死亡案', '私人美术馆灵异事件'],
    sanityEffect: -10,
    firstSightedCaseId: 'case-003',
    relatedOrganizations: ['org-artists-guild'],
    unlockConditions: [
      { type: 'case_completed', requiredId: 'case-003', description: '完成《梦魇画作》案件' }
    ],
    discovered: false,
    loreNotes: [
      '某些艺术流派的创始人据称与异界存在签订了契约，以获得超越常人的灵感。',
      '代价是他们的作品成为了两个世界之间的门户。'
    ]
  }
])

export const forbiddenItems = reactive<ForbiddenItem[]>([
  {
    id: 'item-tainted-telescope',
    name: '受污染的望远镜',
    category: 'forbidden_item',
    icon: '🔭',
    rarity: 'uncommon',
    dangerLevel: 2,
    description: '原属于黑石岛灯塔守望者的望远镜，镜片上残留着未知生物的分泌物，长时间观察会产生幻觉。',
    physicalTraits: '黄铜镜身，部分镜片碎裂，在紫外线下会发出淡淡的荧光。镜筒内壁有触手摩擦的痕迹。',
    effects: [
      '透过镜片观察夜空会看到不应存在的星体',
      '使用者会反复做关于深海的噩梦',
      '连续使用超过72小时会引发幻听',
      '残留黏液会缓慢增殖，需要定期清理'
    ],
    containmentProtocols: [
      '存放于内衬铅的密封箱中',
      '使用时必须佩戴防护手套',
      '单次使用不得超过10分钟',
      '使用者每24小时需接受精神评估'
    ],
    knownOrigins: ['守望者从某个古董商处购得', '可能来自印斯茅斯的沉船打捞物'],
    sanityEffect: -3,
    firstDiscoveredCaseId: 'case-001',
    relatedCreatures: ['creature-deep-one'],
    relatedOrganizations: [],
    unlockConditions: [
      { type: 'evidence_discovered', requiredId: 'evidence-telescope', description: '发现破碎的望远镜' }
    ],
    discovered: false,
    loreNotes: [
      '望远镜最后对准的方向，是天空中某个本不应有任何星体的坐标。',
      '有研究者认为，那是克苏鲁的星位回归时会出现的方向。'
    ]
  },
  {
    id: 'item-abyss-statue',
    name: '海底雕像',
    category: 'forbidden_item',
    icon: '🗿',
    rarity: 'epic',
    dangerLevel: 4,
    description: '描绘着章首人身古神的小型石雕，被海水冲上岸。其眼睛似乎会追踪观察者的移动。',
    physicalTraits: '高约30厘米，由未知深绿色石材雕刻而成。表面触感冰凉且异常光滑，即使离开海水也从不干燥。',
    effects: [
      '半径20米内的人会逐渐出现幻听，听到低沉的祈祷声',
      '长期接触者会梦到沉没的城市拉莱耶',
      '雕像的位置会在无人时缓慢移动',
      '理智值低于50的人无法直视它的眼睛'
    ],
    containmentProtocols: [
      '必须存放于铅密封容器中',
      '容器外层需刻有上古之印',
      '每月检查封印完整性',
      '任何接触人员必须记录精神状态'
    ],
    knownOrigins: ['据说是从深潜者的神殿中失落的祭祀品', '可能是在远古沉没大陆沉没时被带入海洋'],
    sanityEffect: -18,
    firstDiscoveredCaseId: 'case-001',
    relatedCreatures: ['creature-deep-one', 'creature-formless-spawn'],
    relatedOrganizations: ['org-cult-of-cthulhu'],
    unlockConditions: [
      { type: 'evidence_special', requiredId: 'evidence-deep-statue', description: '发现隐藏的海底雕像' }
    ],
    discovered: false,
    loreNotes: [
      '雕刻风格与任何已知文明都不相符，碳同位素测定显示其年代超过人类文明史。',
      '这很可能是克苏鲁崇拜最古老的实物证据之一。',
      '雕像材质的密度异常，约等于同体积黄金的三倍。'
    ]
  },
  {
    id: 'item-elder-amulet',
    name: '古老护符',
    category: 'forbidden_item',
    icon: '📿',
    rarity: 'rare',
    dangerLevel: 3,
    description: '由未知金属铸造的神秘护符，表面刻有触手缠绕的图案。是防御性还是攻击性器具仍待确定。',
    physicalTraits: '金属颜色会根据佩戴者的精神状态变化，从暗金色变为血红色。温度总是比人体低约5度。',
    effects: [
      '佩戴者对精神类攻击有一定抗性',
      '但佩戴者会持续做关于古神的噩梦',
      '在遭遇异界生物时会发热震动发出警告',
      '长期佩戴会增加使用者与异界的共鸣'
    ],
    containmentProtocols: [
      '不用时存放于神圣符号盒中',
      '避免与其他禁忌物品同处',
      '佩戴时间单次不超过24小时'
    ],
    knownOrigins: ['守望者小屋中发现', '可能来自某个秘密教团的高阶成员'],
    sanityEffect: -6,
    firstDiscoveredCaseId: 'case-001',
    relatedCreatures: [],
    relatedOrganizations: ['org-cult-of-dagon'],
    unlockConditions: [
      { type: 'evidence_discovered', requiredId: 'evidence-amulet', description: '发现古老护符' }
    ],
    discovered: false,
    loreNotes: [
      '护符上的图案经解析是一个复杂的封印符文，它可能既是钥匙也是锁。',
      '历史上有数个著名神秘学者的遗物中出现过相似设计。'
    ]
  },
  {
    id: 'item-forbidden-tome',
    name: '禁忌抄本',
    category: 'forbidden_item',
    icon: '📕',
    rarity: 'epic',
    dangerLevel: 5,
    description: '据称是《死灵之书》某个失落版本的残页抄本，包含了召唤外神的仪式。',
    physicalTraits: '用人皮装订的书册，墨水似乎是某种血液混合金属粉末制成。无论翻到哪一页，内容都会略有不同。',
    effects: [
      '阅读者在数周内会迅速消瘦和健忘',
      '书中描述的生物会开始出现在阅读者的生活中',
      '任何试图复制内容的尝试都会失败，复制者会发疯',
      '它会主动寻找新的读者，甚至在无人的夜晚翻页'
    ],
    containmentProtocols: [
      '存放在三重封印的地下保险库',
      '保险库必须建在圣地之上',
      '任何接触必须佩戴心灵防护法器',
      '阅读必须在全副武装的警卫监视下进行'
    ],
    knownOrigins: ['市立图书馆地下藏书室深处发现', '据说是由疯狂阿拉伯人阿卜杜·阿尔哈兹莱德亲手誊写'],
    sanityEffect: -30,
    firstDiscoveredCaseId: 'case-002',
    relatedCreatures: ['creature-shadow-thing', 'creature-formless-spawn'],
    relatedOrganizations: ['org-forbidden-knowledge', 'org-star-chamber'],
    unlockConditions: [
      { type: 'case_completed', requiredId: 'case-002', description: '完成《暗影图书馆》案件' }
    ],
    discovered: false,
    loreNotes: [
      'Ph\'nglui mglw\'nafh Cthulhu R\'lyeh wgah\'nagl fhtagn.',
      '（翻译：在永恒的宅邸拉莱耶中，长眠的克苏鲁候汝入梦。）',
      '以上文字不应被读出声，无论任何语言。'
    ]
  },
  {
    id: 'item-nightmare-canvas',
    name: '梦魇画布',
    category: 'forbidden_item',
    icon: '🎨',
    rarity: 'legendary',
    dangerLevel: 5,
    description: '著名画家自杀前创作的最后一幅画，据说画的是通往另一个维度的门户。所有观者都会做同样的噩梦。',
    physicalTraits: '画中反复出现一个不可能存在的几何图形，观者的视线会被不由自主地吸引过去。颜料中有未知的有机成分。',
    effects: [
      '所有观者都会在梦中看到同一个地方',
      '反复观看者的身体会开始出现画中环境的特征',
      '据说第七次观看时，观者与画中世界会互换位置',
      '画中场景会随时间缓慢变化'
    ],
    containmentProtocols: [
      '完全遮光密封储存',
      '储存室不得有任何反光表面',
      '运输过程中必须全程裹覆神圣布料',
      '任何解封操作必须至少3人在场'
    ],
    knownOrigins: ['画家在死前三个月完成，其创作过程无人知晓'],
    sanityEffect: -35,
    firstDiscoveredCaseId: 'case-003',
    relatedCreatures: ['creature-painting-watcher', 'creature-formless-spawn'],
    relatedOrganizations: ['org-artists-guild', 'org-star-chamber'],
    unlockConditions: [
      { type: 'case_completed', requiredId: 'case-003', description: '完成《梦魇画作》案件' }
    ],
    discovered: false,
    loreNotes: [
      '画家的遗书写道："我画的不是我想象的东西，我只是忠实记录了我看到的东西。"',
      '当被问及"看到了什么"，画家的回复只有一个词："真相。"'
    ]
  }
])

export const organizations = reactive<Organization[]>([
  {
    id: 'org-deep-sea-society',
    name: '深海研究协会',
    category: 'organization',
    icon: '🌊',
    rarity: 'rare',
    influenceLevel: 3,
    description: '表面上是海洋生物学研究机构，实际是与深潜者有秘密接触的组织。',
    history: '成立于1847年，由一批对海洋生物学有兴趣的贵族资助。1890年后研究方向突然转向未知海洋生物，对外停止公布研究成果。',
    goals: [
      '研究深海未知生态系统',
      '（秘密）与深潜者维持古老契约',
      '（秘密）寻找通往伊哈斯雷的海底通道',
      '（秘密）准备迎接"大回归"'
    ],
    knownMembers: ['某位失踪的灯塔守望者（外围成员）', '马萨诸塞州多名海港官员（疑似）'],
    headquarters: '表面总部：波士顿海洋研究中心 / 实际总部：印斯茅斯镇海滨老宅',
    resources: [
      '充足的研究经费',
      '多艘深海考察船',
      '与部分政府官员的关系',
      '与深潜者交易获得的古代宝物'
    ],
    alliedOrganizations: ['org-cult-of-dagon'],
    opposingOrganizations: ['org-star-chamber'],
    firstEncounteredCaseId: 'case-001',
    relatedCreatures: ['creature-deep-one'],
    relatedItems: ['item-abyss-statue'],
    unlockConditions: [
      { type: 'evidence_discovered', requiredId: 'evidence-letter', description: '发现神秘信件' }
    ],
    discovered: false,
    loreNotes: [
      '他们的研究论文在学术界被嘲笑为"幻想文学"，但真实的研究数据从不对外发表。',
      '协会成员的平均寿命超过90岁，但晚年都会选择"隐居海边"，从此消失。'
    ]
  },
  {
    id: 'org-cult-of-dagon',
    name: '达贡密教',
    category: 'organization',
    icon: '⛪',
    rarity: 'epic',
    influenceLevel: 4,
    description: '崇拜父神达贡与母神海德拉的秘密宗教，信徒相信通过献祭可以获得深海的祝福。',
    history: '可追溯至远古时代的海洋崇拜，在腓尼基文明时期就有相关记录。近代以印斯茅斯镇为中心，秘密活动范围遍及全球沿海地区。',
    goals: [
      '唤醒沉睡的古神',
      '确保信徒血脉的"大回归"',
      '收集古代深海遗物',
      '干扰调查员对超自然案件的调查'
    ],
    knownMembers: ['印斯茅斯镇大部分居民', '多名失踪的航海家（已转化）'],
    headquarters: '印斯茅斯镇大衮教会（已被FBI突袭后废弃，但据说转入地下）',
    resources: [
      '来自深海的黄金用于贿赂',
      '深潜者作为武力后盾',
      '沿海地区数百年的经营网络',
      '代代相传的古代仪式知识'
    ],
    alliedOrganizations: ['org-deep-sea-society', 'org-cult-of-cthulhu'],
    opposingOrganizations: ['org-star-chamber', 'org-forbidden-knowledge'],
    firstEncounteredCaseId: 'case-001',
    relatedCreatures: ['creature-deep-one'],
    relatedItems: ['item-elder-amulet', 'item-abyss-statue'],
    unlockConditions: [
      { type: 'clue_discovered', requiredId: 'clue-ritual', description: '发现献祭仪式线索' },
      { type: 'clue_analyzed', requiredId: 'clue-organization', description: '分析深海研究协会' }
    ],
    discovered: false,
    loreNotes: [
      '教义核心：当星辰归位时，沉睡于拉莱耶的克苏鲁将苏醒，届时所有信仰者都将获得"永恒的生命在水之深处"。',
      '密教掌握着数种召唤深海生物的仪式，但成功率并不高，失败的召唤者会...消失。'
    ]
  },
  {
    id: 'org-forbidden-knowledge',
    name: '禁知图书馆',
    category: 'organization',
    icon: '📚',
    rarity: 'epic',
    influenceLevel: 3,
    description: '以收集和保存不应被人类知晓的知识为使命的神秘组织。他们认为封印不是办法，唯有理解才能对抗。',
    history: '起源于文艺复兴时期的秘密学者结社，最初目标是保存被教会焚毁的"异端文献"。随时间推移，收集范围扩展到所有超自然相关的知识。',
    goals: [
      '收集世界各地的禁忌知识',
      '研究对古神和异界生物的防御方法',
      '严格限制知识的传播范围',
      '销毁过于危险的知识（内部对此有争议）'
    ],
    knownMembers: ['多名大学教授（秘密身份）', '稀有书籍收藏家（疑似）'],
    headquarters: '市立图书馆地下藏书室是他们的一个分部',
    resources: [
      '人类历史上最完整的禁忌知识馆藏',
      '大量研究资金',
      '学术界的广泛人脉',
      '一定程度的古代仪式知识'
    ],
    alliedOrganizations: ['org-star-chamber'],
    opposingOrganizations: ['org-cult-of-dagon', 'org-cult-of-cthulhu'],
    firstEncounteredCaseId: 'case-002',
    relatedCreatures: ['creature-shadow-thing'],
    relatedItems: ['item-forbidden-tome'],
    unlockConditions: [
      { type: 'case_completed', requiredId: 'case-002', description: '完成《暗影图书馆》案件' }
    ],
    discovered: false,
    loreNotes: [
      '他们的座右铭是："知晓即是防御，无知即是灭亡。"',
      '但内部有一个激进派认为，只有完全理解禁忌，才能找到对抗古神的方法，即使代价是...自己先疯狂。'
    ]
  },
  {
    id: 'org-artists-guild',
    name: '真理画家行会',
    category: 'organization',
    icon: '🎭',
    rarity: 'rare',
    influenceLevel: 2,
    description: '一个秘密艺术家组织，相信通过艺术创作可以窥见"真实世界"的本质。他们的作品常常被诅咒。',
    history: '成立于19世纪末的巴黎，创始人是三名以"疯画家"闻名的艺术家。20世纪初扩展到美国，成员多为先锋派艺术家。',
    goals: [
      '通过艺术探索人类感知的边界',
      '（秘密）通过创作打开通向其他维度的门户',
      '寻找"真实之美"，即使它超越人类的承受能力'
    ],
    knownMembers: ['完成最后一幅画后自杀的著名画家', '多名被送进精神病院的艺术家'],
    headquarters: '没有固定总部，在各大城市都有"画廊"作为联络点',
    resources: [
      '艺术品市场的巨额财富',
      '与上流社会的关系',
      '神秘的创作灵感来源（可疑）'
    ],
    alliedOrganizations: ['org-cult-of-cthulhu'],
    opposingOrganizations: [],
    firstEncounteredCaseId: 'case-003',
    relatedCreatures: ['creature-painting-watcher'],
    relatedItems: ['item-nightmare-canvas'],
    unlockConditions: [
      { type: 'case_completed', requiredId: 'case-003', description: '完成《梦魇画作》案件' }
    ],
    discovered: false,
    loreNotes: [
      '行会内部流传着一种说法："当你的画作开始自己变化时，你就离真理更近了一步。"',
      '入会仪式涉及在一间漆黑的房间中作画24小时，期间不允许进食或休息。'
    ]
  },
  {
    id: 'org-star-chamber',
    name: '星辰裁决所',
    category: 'organization',
    icon: '⚖️',
    rarity: 'legendary',
    influenceLevel: 5,
    description: '人类对抗超自然威胁的最后防线。一个历史悠久的秘密组织，在全球范围内追踪和封印来自异界的威胁。',
    history: '可追溯至古埃及时代的法老宫廷巫师团。经历代传承与演变，在中世纪成为与宗教裁判所有着微妙关系的独立组织。工业革命后完全世俗化，至今运作方式成谜。',
    goals: [
      '监视和调查全球超自然活动',
      '封印或消灭来自异界的威胁',
      '保护人类不受古神及其仆从的侵害',
      '向公众掩盖真相（必要时不惜代价）'
    ],
    knownMembers: ['身份全部保密，据称各国政府高层都有其代理人'],
    headquarters: '未知，据称位于西藏某处与世隔绝的山脉中',
    resources: [
      '几乎无限的资金',
      '超越时代的神秘科技',
      '数千年积累的对抗超自然经验',
      '与某些异界存在的古老契约（可疑）'
    ],
    alliedOrganizations: ['org-forbidden-knowledge'],
    opposingOrganizations: ['org-cult-of-dagon', 'org-cult-of-cthulhu', 'org-deep-sea-society'],
    firstEncounteredCaseId: 'case-001',
    relatedCreatures: ['creature-deep-one', 'creature-formless-spawn', 'creature-shadow-thing'],
    relatedItems: ['item-abyss-statue', 'item-forbidden-tome', 'item-nightmare-canvas'],
    unlockConditions: [
      { type: 'case_completed', requiredId: 'case-001', description: '完成首个案件后可隐约察觉其存在' },
      { type: 'branch_unlocked', requiredId: 'deep-truth', description: '解锁深层真相分支' }
    ],
    discovered: false,
    loreNotes: [
      '调查员注意：如果你正在阅读这份文件，说明你已经引起了他们的注意。',
      '他们不是敌人，但也绝非朋友。对你而言，他们是...必要之恶。',
      '记住：真相有时比谎言更危险。而裁决所，精通于两者。'
    ]
  },
  {
    id: 'org-cult-of-cthulhu',
    name: '克苏鲁真言教',
    category: 'organization',
    icon: '🐙',
    rarity: 'legendary',
    influenceLevel: 4,
    description: '崇拜沉睡于拉莱耶的伟大克苏鲁的全球性秘密宗教，坚信当星辰归位时主将苏醒，带来"终极解放"。',
    history: '这是人类最古老的宗教之一，早于任何有记载的文明。无数历史事件的背后都能隐约看到他们的影子，但始终无法被彻底消灭。',
    goals: [
      '等待并促成星辰归位',
      '唤醒沉睡中的克苏鲁及其他古神',
      '消除一切阻碍"大觉醒"的障碍',
      '在新秩序中为信徒谋求崇高地位'
    ],
    knownMembers: ['历史上多名暴君与狂人（推测）', '某些超级富豪（高度可疑）'],
    headquarters: '没有固定总部，细胞式运作，各小组之间互不相识',
    resources: [
      '跨越千年积累的财富与权力',
      '掌握着真正的召唤仪式（危险）',
      '部分信徒已获得"祝福"，不再是纯粹人类',
      '无限的耐心——他们已经等了百万年'
    ],
    alliedOrganizations: ['org-cult-of-dagon', 'org-artists-guild'],
    opposingOrganizations: ['org-star-chamber', 'org-forbidden-knowledge'],
    firstEncounteredCaseId: 'case-001',
    relatedCreatures: ['creature-deep-one', 'creature-formless-spawn'],
    relatedItems: ['item-forbidden-tome', 'item-abyss-statue', 'item-nightmare-canvas'],
    unlockConditions: [
      { type: 'evidence_special', requiredId: 'evidence-whisper', description: '记录下诡异的低语' },
      { type: 'clue_analyzed', requiredId: 'clue-call-of-deep', description: '分析深海之音' }
    ],
    discovered: false,
    loreNotes: [
      'Ia! Ia! Cthulhu fhtagn!',
      '（如果你能读懂这句话，你已经是他们的一部分了。）',
      '调查员最高警告：试图深入调查此组织的人，无一例外都...改变了立场。'
    ]
  }
])

export function getAllBestiaryEntries(): BestiaryEntry[] {
  return [...creatures, ...forbiddenItems, ...organizations]
}

export function getCreatureById(id: string): Creature | undefined {
  return creatures.find(c => c.id === id)
}

export function getForbiddenItemById(id: string): ForbiddenItem | undefined {
  return forbiddenItems.find(i => i.id === id)
}

export function getOrganizationById(id: string): Organization | undefined {
  return organizations.find(o => o.id === id)
}

export function getBestiaryEntryById(id: string): BestiaryEntry | undefined {
  return getAllBestiaryEntries().find(e => e.id === id)
}

export function setBestiaryDiscovered(id: string, caseId: string): boolean {
  const entry = getBestiaryEntryById(id)
  if (!entry || entry.discovered) return false
  
  entry.discovered = true
  entry.discoveredAt = Date.now()
  entry.discoveryCaseId = caseId
  return true
}

export function resetBestiaryDiscovery() {
  getAllBestiaryEntries().forEach(entry => {
    entry.discovered = false
    entry.discoveredAt = undefined
    entry.discoveryCaseId = undefined
  })
}
