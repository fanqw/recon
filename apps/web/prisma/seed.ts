import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * 初始化种子数据：
 * 1) 保留管理员账号（admin / admin123）
 * 2) 清空历史业务数据（订单、明细、主数据）
 * 3) 写入语义化中文 mock 数据（含进货地与订单样例）
 */
async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash },
    create: { username: "admin", passwordHash },
  });
  await prisma.user.deleteMany({
    where: { username: { not: "admin" } },
  });

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "OrderCommodity",
      "Order",
      "Commodity",
      "Category",
      "Unit",
      "PurchasePlace"
    RESTART IDENTITY CASCADE
  `);

  const [fruitCategory, vegetableCategory, groceryCategory, proteinCategory] =
    await Promise.all([
      prisma.category.create({
        data: { name: "时令水果", desc: "门店果切、陈列和活动档口常用品类" },
      }),
      prisma.category.create({
        data: { name: "叶菜豆品", desc: "叶菜、豆制品和快周转日配品类" },
      }),
      prisma.category.create({
        data: { name: "粮油干货", desc: "食堂与便利档口的基础备货品类" },
      }),
      prisma.category.create({
        data: { name: "鲜肉水产", desc: "早市鲜肉、水产和冻鲜联用品类" },
      }),
    ]);

  const [jinUnit, jianUnit, boxUnit, bagUnit, bucketUnit] = await Promise.all([
    prisma.unit.create({
      data: { name: "斤", desc: "散称重量计价单位" },
    }),
    prisma.unit.create({
      data: { name: "件", desc: "按件流转的零售包装单位" },
    }),
    prisma.unit.create({
      data: { name: "箱", desc: "整箱到货与仓储交接单位" },
    }),
    prisma.unit.create({
      data: { name: "袋", desc: "袋装米面粮油计量单位" },
    }),
    prisma.unit.create({
      data: { name: "桶", desc: "桶装油品与液体辅料计量单位" },
    }),
  ]);

  const [wuhanPlace, changshaPlace, zhengzhouPlace] = await Promise.all([
    prisma.purchasePlace.create({
      data: {
        place: "武汉",
        marketName: "白沙洲农副产品大市场",
        desc: "华中门店蔬果与鲜肉日采主供货地",
      },
    }),
    prisma.purchasePlace.create({
      data: {
        place: "长沙",
        marketName: "红星全球农批中心",
        desc: "食堂团餐与粮油豆品补货市场",
      },
    }),
    prisma.purchasePlace.create({
      data: {
        place: "郑州",
        marketName: "万邦国际农产品物流城",
        desc: "周末活动备货与大宗集采市场",
      },
    }),
  ]);

  const [
    watermelon,
    mango,
    blueberry,
    bokChoy,
    lotusRoot,
    tofu,
    rice,
    rapeseedOil,
    pork,
    chicken,
    shrimp,
  ] = await Promise.all([
    prisma.commodity.create({
      data: {
        name: "麒麟西瓜",
        categoryId: fruitCategory.id,
        unitId: jinUnit.id,
        desc: "适合果切档口与门店活动促销",
      },
    }),
    prisma.commodity.create({
      data: {
        name: "海南芒果",
        categoryId: fruitCategory.id,
        unitId: jinUnit.id,
        desc: "夏季陈列和果切拼盘高频品项",
      },
    }),
    prisma.commodity.create({
      data: {
        name: "盒装蓝莓",
        categoryId: fruitCategory.id,
        unitId: boxUnit.id,
        desc: "精品水果和会员活动常用品项",
      },
    }),
    prisma.commodity.create({
      data: {
        name: "上海青",
        categoryId: vegetableCategory.id,
        unitId: jinUnit.id,
        desc: "食堂快炒与生鲜档口常备叶菜",
      },
    }),
    prisma.commodity.create({
      data: {
        name: "洪湖莲藕",
        categoryId: vegetableCategory.id,
        unitId: jinUnit.id,
        desc: "卤味档口与后厨切配常用品项",
      },
    }),
    prisma.commodity.create({
      data: {
        name: "北豆腐",
        categoryId: vegetableCategory.id,
        unitId: jianUnit.id,
        desc: "社区食堂与熟食档口常备豆制品",
      },
    }),
    prisma.commodity.create({
      data: {
        name: "五常大米",
        categoryId: groceryCategory.id,
        unitId: bagUnit.id,
        desc: "食堂主食档口袋装备货",
      },
    }),
    prisma.commodity.create({
      data: {
        name: "鲁花菜籽油",
        categoryId: groceryCategory.id,
        unitId: bucketUnit.id,
        desc: "团餐后厨和熟食档口常备油品",
      },
    }),
    prisma.commodity.create({
      data: {
        name: "前腿猪肉",
        categoryId: proteinCategory.id,
        unitId: jinUnit.id,
        desc: "鲜肉档口与后厨加工常用品项",
      },
    }),
    prisma.commodity.create({
      data: {
        name: "鸡胸肉",
        categoryId: proteinCategory.id,
        unitId: jinUnit.id,
        desc: "轻食档口和食堂备餐常用禽肉",
      },
    }),
    prisma.commodity.create({
      data: {
        name: "基围虾",
        categoryId: proteinCategory.id,
        unitId: boxUnit.id,
        desc: "周末活动和高客单促销水产样本",
      },
    }),
  ]);

  const commodityByName = {
    watermelon,
    mango,
    blueberry,
    bokChoy,
    lotusRoot,
    tofu,
    rice,
    rapeseedOil,
    pork,
    chicken,
    shrimp,
  };

  const orderPlans = [
    {
      name: "2026-03-24 白沙洲门店周初补货单",
      purchasePlaceId: wuhanPlace.id,
      desc: "周初先补叶菜与鲜肉，保障工作日早高峰供应",
      createdAt: "2026-03-24T02:30:00.000Z",
      lines: [
        { commodity: "bokChoy", count: 28, price: "3.40", lineTotal: "95.20", desc: "门店叶菜晨采补货" },
        { commodity: "pork", count: 26, price: "14.20", lineTotal: "369.20", desc: "鲜肉档口常规补货" },
      ],
    },
    {
      name: "2026-03-27 红星团餐后厨备货单",
      purchasePlaceId: changshaPlace.id,
      desc: "午晚餐高峰前补足豆制品和主食",
      createdAt: "2026-03-27T01:20:00.000Z",
      lines: [
        { commodity: "tofu", count: 60, price: "2.20", lineTotal: "132.00", desc: "团餐后厨日配豆制品" },
        { commodity: "rice", count: 16, price: "95.00", lineTotal: "1520.00", desc: "主食档口周中补货" },
        { commodity: "rapeseedOil", count: 5, price: "78.00", lineTotal: "390.00", desc: "后厨基础油品补货" },
      ],
    },
    {
      name: "2026-03-30 万邦周末活动预采单",
      purchasePlaceId: zhengzhouPlace.id,
      desc: "会员日活动前置备货，水果和水产先行入库",
      createdAt: "2026-03-30T03:10:00.000Z",
      lines: [
        { commodity: "watermelon", count: 42, price: "4.60", lineTotal: "193.20", desc: "活动果切主推西瓜" },
        { commodity: "blueberry", count: 18, price: "26.00", lineTotal: "468.00", desc: "精品水果礼盒补货" },
        { commodity: "shrimp", count: 6, price: "162.00", lineTotal: "972.00", desc: "周末活动水产预备" },
      ],
    },
    {
      name: "2026-04-02 白沙洲清明前日配补货单",
      purchasePlaceId: wuhanPlace.id,
      desc: "节前短保商品滚动补货，控制库存周转",
      createdAt: "2026-04-02T01:50:00.000Z",
      lines: [
        { commodity: "bokChoy", count: 24, price: "3.80", lineTotal: "91.20", desc: "叶菜节前平价补货" },
        { commodity: "lotusRoot", count: 20, price: "4.50", lineTotal: "90.00", desc: "卤味档口切配备货" },
        { commodity: "chicken", count: 18, price: "10.80", lineTotal: "194.40", desc: "轻食档口禽肉补货" },
      ],
    },
    {
      name: "2026-04-06 红星节后复工备货单",
      purchasePlaceId: changshaPlace.id,
      desc: "节后恢复供餐，主食和鲜肉同步补足",
      createdAt: "2026-04-06T02:40:00.000Z",
      lines: [
        { commodity: "rice", count: 14, price: "96.00", lineTotal: "1344.00", desc: "复工后主食档口补货" },
        { commodity: "pork", count: 20, price: "14.40", lineTotal: "288.00", desc: "鲜肉档口恢复供应" },
      ],
    },
    {
      name: "2026-04-09 万邦会员水果补货单",
      purchasePlaceId: zhengzhouPlace.id,
      desc: "会员水果周活动，精品果和果切水果集中采购",
      createdAt: "2026-04-09T03:00:00.000Z",
      lines: [
        { commodity: "mango", count: 30, price: "9.60", lineTotal: "288.00", desc: "热带水果主推补货" },
        { commodity: "blueberry", count: 20, price: "25.50", lineTotal: "510.00", desc: "精品盒果补货" },
        { commodity: "watermelon", count: 38, price: "4.90", lineTotal: "186.20", desc: "果切活动西瓜补货" },
      ],
    },
    {
      name: "2026-04-12 白沙洲周末团购备货单",
      purchasePlaceId: wuhanPlace.id,
      desc: "社区团购高峰前补齐蔬菜和豆制品",
      createdAt: "2026-04-12T02:15:00.000Z",
      lines: [
        { commodity: "tofu", count: 45, price: "2.30", lineTotal: "103.50", desc: "团购豆制品补货" },
        { commodity: "bokChoy", count: 32, price: "3.50", lineTotal: "112.00", desc: "社区团购叶菜补货" },
        { commodity: "lotusRoot", count: 18, price: "4.80", lineTotal: "86.40", desc: "团购配菜补货" },
      ],
    },
    {
      name: "2026-04-15 红星后厨稳价采购单",
      purchasePlaceId: changshaPlace.id,
      desc: "后厨稳定采购周期，保留一笔手工议价金额样本",
      createdAt: "2026-04-15T01:35:00.000Z",
      lines: [
        { commodity: "rapeseedOil", count: 4, price: "79.50", lineTotal: "318.00", desc: "桶装油品稳价采购" },
        { commodity: "chicken", count: 24, price: "10.60", lineTotal: "254.40", desc: "轻食档口禽肉补货" },
        { commodity: "pork", count: 22, price: "14.50", lineTotal: "315.00", desc: "议价后抹零结算样本" },
      ],
    },
    {
      name: "2026-04-18 白沙洲生鲜补货单",
      purchasePlaceId: wuhanPlace.id,
      desc: "门店早市补齐水果、叶菜和鲜肉，联调订单详情样本",
      createdAt: "2026-04-18T05:30:00.000Z",
      lines: [
        { commodity: "watermelon", count: 36, price: "4.80", lineTotal: "172.80", desc: "西瓜整车拆零入库" },
        { commodity: "bokChoy", count: 18, price: "3.60", lineTotal: "64.80", desc: "叶菜晨采补货" },
        { commodity: "pork", count: 22, price: "14.50", lineTotal: "315.00", desc: "鲜肉档口补货" },
      ],
    },
    {
      name: "2026-04-19 红星食堂备货单",
      purchasePlaceId: changshaPlace.id,
      desc: "午餐档口补充豆制品和主食，订单列表稳定展示样本",
      createdAt: "2026-04-19T02:10:00.000Z",
      lines: [
        { commodity: "tofu", count: 40, price: "2.30", lineTotal: "92.00", desc: "食堂日配豆制品" },
        { commodity: "rice", count: 12, price: "96.00", lineTotal: "1152.00", desc: "袋装主食周中补货" },
      ],
    },
    {
      name: "2026-04-20 万邦周末促销备货单",
      purchasePlaceId: zhengzhouPlace.id,
      desc: "周末活动档口备货，覆盖水果、水产和高客单场景",
      createdAt: "2026-04-20T01:20:00.000Z",
      lines: [
        { commodity: "shrimp", count: 8, price: "168.50", lineTotal: "1348.00", desc: "周末活动档口水产备货" },
        { commodity: "mango", count: 24, price: "9.80", lineTotal: "235.20", desc: "活动水果主推备货" },
      ],
    },
    {
      name: "2026-04-20 白沙洲早市联动补货单",
      purchasePlaceId: wuhanPlace.id,
      desc: "同日多地补货样本，覆盖早市水果与叶菜联动到货",
      createdAt: "2026-04-20T03:45:00.000Z",
      lines: [
        { commodity: "watermelon", count: 28, price: "4.75", lineTotal: "133.00", desc: "早市果切联动补货" },
        { commodity: "bokChoy", count: 26, price: "3.55", lineTotal: "92.30", desc: "叶菜晨采联动补货" },
      ],
    },
    {
      name: "2026-04-20 红星团餐应急补货单",
      purchasePlaceId: changshaPlace.id,
      desc: "同日多地补货样本，午餐高峰前应急补足豆制品与主食",
      createdAt: "2026-04-20T05:10:00.000Z",
      lines: [
        { commodity: "tofu", count: 36, price: "2.35", lineTotal: "84.60", desc: "食堂午餐应急豆制品" },
        { commodity: "rice", count: 10, price: "96.50", lineTotal: "965.00", desc: "主食档口应急补货" },
      ],
    },
    {
      name: "2026-04-22 白沙洲月末滚动补货单",
      purchasePlaceId: wuhanPlace.id,
      desc: "月末控库存补货，金额结构更平滑，便于工作台观察趋势",
      createdAt: "2026-04-22T00:50:00.000Z",
      lines: [
        { commodity: "lotusRoot", count: 22, price: "4.60", lineTotal: "101.20", desc: "卤味档口月末滚动补货" },
        { commodity: "chicken", count: 16, price: "10.50", lineTotal: "168.00", desc: "轻食档口月末滚动补货" },
        { commodity: "blueberry", count: 10, price: "24.50", lineTotal: "245.00", desc: "精品水果小批量补货" },
      ],
    },
    {
      name: "2026-04-22 红星月末平衡补货单",
      purchasePlaceId: changshaPlace.id,
      desc: "同日多地补货样本，月末平衡主食与禽肉库存结构",
      createdAt: "2026-04-22T02:05:00.000Z",
      lines: [
        { commodity: "rice", count: 9, price: "97.00", lineTotal: "873.00", desc: "月末主食平衡补货" },
        { commodity: "chicken", count: 18, price: "10.70", lineTotal: "192.60", desc: "禽肉库存平衡补货" },
      ],
    },
    {
      name: "2026-04-22 万邦晚间活动追补单",
      purchasePlaceId: zhengzhouPlace.id,
      desc: "同日多地补货样本，晚间活动追补精品水果与水产",
      createdAt: "2026-04-22T06:40:00.000Z",
      lines: [
        { commodity: "blueberry", count: 12, price: "25.20", lineTotal: "302.40", desc: "晚间活动精品水果追补" },
        { commodity: "shrimp", count: 4, price: "171.00", lineTotal: "684.00", desc: "活动档口水产追补" },
      ],
    },
  ] as const;

  for (const plan of orderPlans) {
    const order = await prisma.order.create({
      data: {
        name: plan.name,
        purchasePlaceId: plan.purchasePlaceId,
        desc: plan.desc,
        createdAt: new Date(plan.createdAt),
      },
    });

    await prisma.orderCommodity.createMany({
      data: plan.lines.map((line) => ({
        orderId: order.id,
        commodityId: commodityByName[line.commodity].id,
        count: line.count,
        price: line.price,
        lineTotal: line.lineTotal,
        desc: line.desc,
      })),
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
