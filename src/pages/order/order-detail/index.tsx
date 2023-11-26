import { DataType as CategoryDataType } from '@pages/category'
import { DataType as CommodityDataType } from '@pages/commodity'
import { DataType as UnitDataType } from '@pages/unit'
import commodityService from '@services/commodity.service'
import orderCommodityService from '@services/order-commodity.service'
import orderService from '@services/order.service'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import html2canvas from 'html2canvas'
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import './index.scss'

const { Search } = Input

interface DataType {
  id: string
  name: string
  desc: string
  count: number
  price: number
  commodity: CommodityDataType
  category: CategoryDataType
  unit: UnitDataType
  create_at: Date
  update_at: Date
}

interface OrderDetail {
  name: string
  desc: string
}

const max = 50

const OrderDetail: React.FC = () => {
  const [form] = Form.useForm()
  const params = useParams()
  const orderId = params.id || ''
  const [orderDetail, setOrderDetail] = useState<OrderDetail>({
    name: '',
    desc: '',
  })
  const [commodityList, setCommodityList] = useState<DataType[]>([])
  const [list, setList] = useState([])
  const [open, setOpen] = useState(false)
  const [orderCommodityId, setOrderCommodityId] = useState('')
  const [listLoading, setListLoading] = useState(true)
  const [modalLoading, setModalLoading] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)
  const [showAction, setShowAction] = useState(true)

  useEffect(() => {
    handleOrderDetail(orderId)
    handleOrderCommodityList(orderId)
    handleCommodityList()
  }, [])

  const handleOrderDetail = async (id: string) => {
    const res = await orderService.getOrder(id)
    if (res.code === 200) {
      setOrderDetail(res.data)
    } else {
      setOrderDetail({
        name: '',
        desc: '',
      })
    }
  }

  const handleOrderCommodityList = async (id: string) => {
    setListLoading(true)
    const res = await orderCommodityService.getOrderCommodityList(id)
    setListLoading(false)
    if (res.code === 200) {
      setList(res.data)
    } else {
      setList([])
    }
  }

  const handleCommodityList = async () => {
    const res = await commodityService.getCommodityList({
      current: 1,
      pageSize: 10000,
    })
    if (res.code === 200) {
      const data = res.data.rows.map((item: any) => ({
        value: item.id,
        label: `${item.name}（${item.unit.name}）`,
      }))
      setCommodityList(data)
    } else {
      setCommodityList([])
    }
  }

  const handleOpenModal = (data: any) => {
    form.setFieldsValue(data)
    setOpen(true)
  }

  const handleCloseModal = (refresh: boolean) => {
    form.resetFields()
    setOrderCommodityId('')
    setOpen(false)
    if (refresh) {
      handleOrderCommodityList(orderId)
    }
  }

  const handleCreateOrderCommodity = async (values: any) => {
    const res = await orderCommodityService.createOrderCommodity(values)
    setModalLoading(false)
    if (res?.code === 200) {
      message.success('创建成功')
      handleCloseModal(true)
      return
    }
    message.error('创建失败，请重试')
  }

  const handleUpdateOrderCommodity = async (id: string, values: any) => {
    const res = await orderCommodityService.editOrderCommodity(id, values)
    setModalLoading(false)
    if (res?.code === 200) {
      message.success('修改成功')
      handleCloseModal(true)
      return
    }

    message.error('修改失败，请重试')
  }

  const handleRemove = async (id: string) => {
    setRemoveLoading(true)
    const res = await orderCommodityService.removeOrderCommodity(id)
    setRemoveLoading(false)
    if (res?.code === 200) {
      message.success('删除成功')
      handleOrderCommodityList(orderId)
    } else {
      message.error(`删除失败，失败原因：${res.message}`)
    }
  }

  const onFinish = (values: any) => {
    const params = Object.assign({}, values, { order_id: orderId })
    setModalLoading(true)
    if (orderCommodityId) {
      handleUpdateOrderCommodity(orderCommodityId, params)
    } else {
      handleCreateOrderCommodity(params)
    }
  }

  const handleChangeCount = (value: number | null) => {
    const price = form.getFieldValue('price') || 0
    const totalPrice = (value || 0) * price
    form.setFieldValue('total_price', totalPrice)
  }

  const handleChangePrice = (value: number | null) => {
    const count = form.getFieldValue('count') || 0
    const totalPrice = (value || 0) * count
    form.setFieldValue('total_price', totalPrice)
  }

  const handleTotalPrice = (value: number | null) => {
    const count = form.getFieldValue('count') || 0
    const price = Math.round(((value || 0) * 10000) / count) / 10000
    form.setFieldValue('price', price)
  }

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo)
  }

  const convertToImage = async (container: any, options?: any) => {
    // 设置放大倍数
    const scale = window.devicePixelRatio * 2

    // 传入节点原始宽高
    const _width = container.offsetWidth
    const _height = container.offsetHeight

    let { width, height } = options
    width = width || _width
    height = height || _height

    // html2canvas配置项
    const ops = {
      ...options,
      scale,
      useCORS: true,
      allowTaint: false,
      width,
      height,
    }

    // console.log('ops', ops)
    // console.log('container', container)

    return html2canvas(container, ops).then((canvas) => {
      // 返回图片的二进制数据
      return canvas.toBlob((blob: any) => {
        const element = document.createElement('a')
        const url = URL.createObjectURL(blob)
        element.download = `${orderDetail.name}.png`
        element.style.display = 'none'
        element.href = url
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
      })
    })
  }

  const handleClick = () => {
    setShowAction(false)
    setTimeout(() => {
      // 调用函数，取到截图的二进制数据，对图片进行处理（保存本地、展示等）
      convertToImage(document.getElementById('table'), {
        width: 1240,
        height: 1754,
      }).then((res) => {
        setShowAction(true)
      })
    }, 0)
  }

  const columns: ColumnsType<DataType> = [
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category.name',
      onCell: (record, rowIndex) => {
        let rowSpan = 0
        if (
          rowIndex === 0 ||
          (rowIndex &&
            record.category.name !==
              (list[rowIndex - 1] as DataType).category.name)
        ) {
          rowSpan = list.filter(
            (item: DataType) => item.category.name === record.category.name
          ).length
        }

        return {
          rowSpan,
        }
      },
      render: (category) => <div>{category?.name ?? '--'}</div>,
    },
    {
      title: '名称',
      dataIndex: 'commodity',
      key: 'commodity.name',
      render: (commodity) => <div>{commodity?.name ?? '--'}</div>,
    },
    {
      title: '数量',
      dataIndex: 'count',
      key: 'count',
      render: (text) => <div>{text}</div>,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit.name',
      render: (unit) => <div>{unit?.name ?? '--'}</div>,
    },
    {
      title: '单价',
      dataIndex: 'price',
      key: 'price',
      render: (text) => <div>{text}</div>,
    },
    {
      title: '金额',
      dataIndex: 'total_price',
      key: 'total_price',
      render: (totalPrice, record: any) => {
        return (
          <div
            style={{
              color: totalPrice !== record?.origin_total_price ? 'red' : '#333',
            }}
          >
            {totalPrice}
          </div>
        )
      },
    },
    {
      title: '备注',
      dataIndex: 'desc',
      key: 'desc',
      render: (text) => <div>{text}</div>,
    },
    // {
    //   title: '更新时间',
    //   dataIndex: 'update_at',
    //   key: 'update_at',
    //   render: (value) =>
    //     value ? dayjs(value).format('YYYY-MM-DD HH:MM:ss') : '--',
    // },
    // {
    //   title: '创建时间',
    //   dataIndex: 'create_at',
    //   key: 'create_at',
    //   render: (value) =>
    //     value ? dayjs(value).format('YYYY-MM-DD HH:MM:ss') : '--',
    // },
    {
      title: '分类金额',
      dataIndex: 'total_category_price',
      key: 'total_category_price',
      // width: 150,
      onCell: (record, rowIndex) => {
        let rowSpan = 0
        if (
          rowIndex === 0 ||
          (rowIndex &&
            record.category.name !==
              (list[rowIndex - 1] as DataType).category.name)
        ) {
          rowSpan = list.filter(
            (item: DataType) => item.category.name === record.category.name
          ).length
        }

        return {
          rowSpan,
        }
      },
      render: (text) => <div>{text}</div>,
    },
    {
      title: '总金额',
      dataIndex: 'total_order_price',
      key: 'total_order_price',
      // width: 150,
      onCell: (_record, rowIndex) => {
        let rowSpan = 0
        if (rowIndex === 0) {
          rowSpan = list.length
        }
        return {
          rowSpan,
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      className: showAction
        ? 'orderDetail-showAction'
        : 'orderDetail-hiddenAction',
      render: (_, record: any) => {
        const loading = removeLoading && record.id === orderCommodityId
        return (
          <Space size="middle">
            <a
              onClick={() => {
                setOrderCommodityId(record.id)
                handleOpenModal({
                  commodity_id: record.commodity.id,
                  count: record.count,
                  price: record.price,
                  desc: record.desc,
                  total_price: record.total_price,
                })
              }}
            >
              编辑
            </a>
            {loading ? (
              <span style={{ color: '#999' }}>删除</span>
            ) : (
              <a onClick={() => handleRemove(record.id)}>删除</a>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <>
      <Card
        title="订单信息"
        extra={<Button onClick={() => history.back()}>返回</Button>}
      >
        <div className="orderDetail-header">
          <div style={{ display: 'flex', height: 24, lineHeight: 1.5 }}>
            <div>共 {list.length} 项</div>
            {list.length > max && (
              <div style={{ color: 'red', fontWeight: 'bold', marginLeft: 36 }}>
                订单商品已录入{max}条，超出部分可能无法打印！！！
              </div>
            )}
          </div>
          <div>
            <Button
              type="primary"
              onClick={() => {
                setOrderCommodityId('')
                handleOpenModal({
                  commodity_id: undefined,
                  count: undefined,
                  price: undefined,
                  desc: '',
                })
              }}
            >
              新增
            </Button>
            <Button
              style={{ marginLeft: 16 }}
              onClick={() => handleClick()}
              type="primary"
            >
              下载
            </Button>
          </div>
        </div>
        <Table
          id="table"
          rowKey="id"
          loading={listLoading}
          columns={columns}
          dataSource={list}
          bordered
          size="small"
          pagination={false}
          className={showAction ? '' : 'orderDetail-table'}
          title={() => <div>{orderDetail.desc}</div>}
          // summary={() => (
          //   <Table.Summary.Row>
          //     <Table.Summary.Cell index={0} colSpan={showAction ? 10 : 9}>
          //       <div>{orderDetail.desc}</div>
          //     </Table.Summary.Cell>
          //   </Table.Summary.Row>
          // )}
        />
      </Card>
      <Modal
        title={`${orderCommodityId ? '编辑' : '新增'}订单商品`}
        open={open}
        footer={false}
        destroyOnClose
        onCancel={() => handleCloseModal(false)}
      >
        <Form
          name="basic"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 18 }}
          style={{ maxWidth: 600 }}
          onFinish={onFinish}
          form={form}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
        >
          <Form.Item
            label="商品名称"
            name="commodity_id"
            rules={[{ required: true, message: '请选择订单商品!' }]}
          >
            <Select
              showSearch
              placeholder="请选择商品分类"
              optionFilterProp="children"
              options={commodityList}
              filterOption={(input, option: any) =>
                (option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item
            label="商品数量"
            name="count"
            rules={[{ required: true, message: '请输入商品数量!' }]}
          >
            <InputNumber
              style={{ width: '100% ' }}
              placeholder="请输入商品数量"
              onChange={handleChangeCount}
              min={0}
            />
          </Form.Item>
          <Form.Item
            label="商品单价"
            name="price"
            rules={[{ required: true, message: '请输入商品价格!' }]}
          >
            <InputNumber
              style={{ width: '100% ' }}
              placeholder="请输入商品单价"
              onChange={handleChangePrice}
              // min={0}
            />
          </Form.Item>
          <Form.Item label="商品总价" name="total_price">
            <InputNumber
              // disabled={}
              style={{ width: '100% ' }}
              placeholder="请输入商品总价"
              onChange={handleTotalPrice}
              // min={0}
            />
          </Form.Item>

          <Form.Item label="商品备注" name="desc">
            <Input.TextArea placeholder="请输入商品备注" rows={5} />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 10, span: 14 }}>
            <Button type="primary" htmlType="submit" loading={modalLoading}>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default OrderDetail
