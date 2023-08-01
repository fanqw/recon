import { DataType as CategoryDateType } from '@pages/category'
import { DataType as UnitDateType } from '@pages/unit'
import categoryService from '@services/category.service'
import commodityService from '@services/commodity.service'
import unitService from '@services/unit.service'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tooltip,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import './index.scss'

const { Search } = Input

export interface DataType {
  id: string
  name: string
  desc: string
  create_at: Date
  update_at: Date
  category: CategoryDateType
  unit: UnitDateType
}

const Commodity: React.FC = () => {
  const [categoryList, setCategoryList] = useState([])
  const [unitList, setUnitList] = useState([])
  const [list, setList] = useState([])
  const [modalData, setModalData] = useState({
    name: '',
    category_id: undefined,
    unit_id: undefined,
    desc: '',
  })
  const [commodityId, setCommodityId] = useState('')
  const [open, setOpen] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)

  useEffect(() => {
    handleCategoryList()
    handleCommodityList()
    handleUnitList()
  }, [])

  const handleCategoryList = async () => {
    const res = await categoryService.getCategoryList()
    if (res.code === 200) {
      const data = res.data.map((item: any) => ({
        value: item.id,
        label: item.name,
      }))
      setCategoryList(data)
    } else {
      setCategoryList([])
    }
  }

  const handleUnitList = async () => {
    const res = await unitService.getUnitList()
    if (res.code === 200) {
      const data = res.data.map((item: any) => ({
        value: item.id,
        label: item.name,
      }))
      setUnitList(data)
    } else {
      setUnitList([])
    }
  }

  const handleCommodityList = async () => {
    setListLoading(true)
    const res = await commodityService.getCommodityList()
    setListLoading(false)
    if (res.code === 200) {
      setList(res.data)
    } else {
      setList([])
    }
  }

  const handleOpenModal = (data: any) => {
    setModalData(data)
    setOpen(true)
  }

  const handleCloseModal = (refresh: boolean) => {
    setModalData({
      name: '',
      category_id: undefined,
      unit_id: undefined,
      desc: '',
    })
    setCommodityId('')
    setOpen(false)
    if (refresh) {
      handleCommodityList()
    }
  }

  const handleCreateCommodity = async (values: any) => {
    const res = await commodityService.createCommodity(values)
    setLoading(false)
    if (res?.code === 200) {
      message.success('创建成功')
      handleCloseModal(true)
      return
    }
    message.error('创建失败，请重试')
  }

  const handleUpdateCommodity = async (id: string, values: any) => {
    const res = await commodityService.editCommodity(id, values)
    setLoading(false)
    if (res?.code === 200) {
      message.success('修改成功')
      handleCloseModal(true)
      return
    }

    message.error('修改失败，请重试')
  }

  const handleRemove = async (id: string) => {
    setCommodityId(id)
    setRemoveLoading(true)
    const res = await commodityService.removeCommodity(id)
    setRemoveLoading(false)
    if (res?.code === 200) {
      message.success('删除成功')
      handleCommodityList()
    } else {
      message.error(`删除失败，失败原因：${res.message}`)
    }
  }

  const onFinish = async (values: any) => {
    setLoading(true)
    if (commodityId) {
      handleUpdateCommodity(commodityId, values)
    } else {
      handleCreateCommodity(values)
    }
  }

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo)
  }

  const columns: ColumnsType<DataType> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <a>{text}</a>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'categoryName',
      render: (category) => (
        <div>
          <Tooltip placement="top" title={category?.desc}>
            {category.name}
          </Tooltip>
        </div>
      ),
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unitName',
      render: (unit) => (
        <div>
          <Tooltip placement="top" title={unit?.desc}>
            {unit.name}
          </Tooltip>
        </div>
      ),
    },
    {
      title: '备注',
      dataIndex: 'desc',
      key: 'desc',
    },
    {
      title: '更新时间',
      dataIndex: 'update_at',
      key: 'update_at',
      render: (value) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:MM:ss') : '--',
    },
    {
      title: '创建时间',
      dataIndex: 'create_at',
      key: 'create_at',
      render: (value) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:MM:ss') : '--',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const loading = removeLoading && record.id === commodityId
        return (
          <Space size="middle">
            <a
              onClick={() => {
                setCommodityId(record.id)
                handleOpenModal({
                  name: record.name,
                  desc: record.desc,
                  category_id: record.category.id,
                  unit_id: record.unit.id,
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
      <Card title="商品信息">
        <div className="commodity-header">
          <Button
            type="primary"
            onClick={() => {
              setCommodityId('')
              handleOpenModal({
                name: '',
                desc: '',
                category_id: undefined,
                unit_id: undefined,
              })
            }}
          >
            新增
          </Button>
          <Search
            placeholder="请输入名称、备注搜索"
            allowClear
            enterButton="搜索"
            size="middle"
            className="commodity-search"
            // onSearch={onSearch}
          />
        </div>
        <Table
          rowKey="id"
          loading={listLoading}
          columns={columns}
          dataSource={list}
          pagination={false}
        />
      </Card>
      <Modal
        title={`${commodityId ? '编辑' : '新增'}商品`}
        open={open}
        footer={false}
        onCancel={() => setOpen(false)}
        destroyOnClose
      >
        <Form
          name="basic"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 18 }}
          style={{ maxWidth: 600 }}
          initialValues={modalData}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
        >
          <Form.Item
            label="商品名称"
            name="name"
            rules={[{ required: true, message: '请输入商品名称!' }]}
          >
            <Input placeholder="请输入商品名称" />
          </Form.Item>
          <Form.Item
            label="商品分类"
            name="category_id"
            rules={[{ required: true, message: '请选择商品分类!' }]}
          >
            <Select
              showSearch
              placeholder="请选择商品分类"
              optionFilterProp="children"
              options={categoryList}
              filterOption={(input, option: any) =>
                (option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item
            label="商品单位"
            name="unit_id"
            rules={[{ required: true, message: '请选择商品单位!' }]}
          >
            <Select
              showSearch
              placeholder="请选择商品单位"
              optionFilterProp="children"
              options={unitList}
              filterOption={(input, option: any) =>
                (option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item label="商品备注" name="desc">
            <Input.TextArea placeholder="请输入商品备注" rows={5} />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 10, span: 14 }}>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Commodity
