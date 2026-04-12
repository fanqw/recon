# test-fixtures

## Requirements

### Requirement: 提供可重复的中文语义化测试种子数据
系统 SHALL 提供可重复执行的数据种子脚本，在清空业务数据后重建中文语义化样本，以支持开发联调与自动化测试。

#### Scenario: 执行种子脚本后重置业务数据
- **WHEN** 开发者或测试流程执行 seed
- **THEN** 业务数据 SHALL 被清理并重建，管理员账号等必要基础账号保持可用

#### Scenario: 种子包含约定主数据样本
- **WHEN** seed 完成后读取主数据
- **THEN** 分类 SHALL 包含水果/蔬菜/副食/肉类，单位 SHALL 包含斤/件/箱，商品 SHALL 包含苹果/生菜/米/面/猪肉

#### Scenario: 种子包含约定进货地样本
- **WHEN** seed 完成后读取进货地
- **THEN** 数据 SHALL 包含武汉-中心港市场与洛阳-宏进市场等语义化记录

#### Scenario: 种子包含可用订单联调样本
- **WHEN** seed 完成后读取订单与明细
- **THEN** 系统 SHALL 至少存在一笔可进入详情页的订单及其商品明细
