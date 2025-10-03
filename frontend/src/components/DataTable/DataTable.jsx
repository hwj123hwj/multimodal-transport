import React, { useState, useMemo } from 'react';
import { Table, Button, Space, Input, message } from 'antd';
import { SearchOutlined, FilterOutlined, ExportOutlined, ReloadOutlined } from '@ant-design/icons';
import './DataTable.css';

const { Search } = Input;

// 分页配置
const PAGINATION_CONFIG = {
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
  pageSizeOptions: ['10', '20', '50', '100'],
  defaultPageSize: 20,
  size: 'middle'
};

// 格式化函数
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '-';
  return `¥${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
};

const formatWeight = (value) => {
  if (value === null || value === undefined) return '-';
  return `${Number(value).toLocaleString('zh-CN')} 吨`;
};

const formatVolume = (value) => {
  if (value === null || value === undefined) return '-';
  return `${Number(value).toLocaleString('zh-CN')} m³`;
};

const formatTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleString('zh-CN');
};

const formatDistance = (value) => {
  if (value === null || value === undefined) return '-';
  return `${Number(value).toLocaleString('zh-CN')} km`;
};

const formatNumber = (value) => {
  if (value === null || value === undefined) return '-';
  return Number(value).toLocaleString('zh-CN');
};

/**
 * 数据表格组件
 * @param {Object} props - 组件属性
 * @param {Array} props.data - 表格数据
 * @param {Array} props.columns - 表格列配置
 * @param {boolean} props.loading - 加载状态
 * @param {string} props.title - 表格标题
 * @param {boolean} props.searchable - 是否可搜索
 * @param {boolean} props.filterable - 是否可筛选
 * @param {boolean} props.exportable - 是否可导出
 * @param {boolean} props.reloadable - 是否可重新加载
 * @param {string|Function} props.rowKey - 行键
 * @param {Object} props.pagination - 分页配置
 * @param {Object} props.scroll - 滚动配置
 * @param {string} props.size - 表格大小
 * @param {string} props.className - 自定义类名
 * @param {Object} props.style - 自定义样式
 * @param {Function} props.onRowClick - 行点击事件
 * @param {Function} props.onSelectionChange - 选择变化事件
 * @param {Function} props.onReload - 重新加载事件
 * @param {Object} props.components - 自定义组件
 */
const DataTable = ({
  data = [],
  columns = [],
  loading = false,
  title = '',
  searchable = true,
  filterable = true,
  exportable = true,
  reloadable = true,
  rowKey = 'id',
  pagination = PAGINATION_CONFIG,
  scroll = { x: 'max-content' },
  size = 'middle',
  className = '',
  style = {},
  onRowClick,
  onSelectionChange,
  onReload,
  components,
  ...props
}) => {
  // 状态管理
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({});
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  // 过滤和排序逻辑
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    
    let result = [...data];

    // 搜索过滤
    if (searchText) {
      result = result.filter(record => {
        return columns.some(column => {
          const value = record[column.dataIndex];
          return value && value.toString().toLowerCase().includes(searchText.toLowerCase());
        });
      });
    }

    // 列过滤器
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key].length > 0) {
        result = result.filter(record => filters[key].includes(record[key]));
      }
    });

    // 排序
    if (sortField && sortOrder) {
      result.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (sortOrder === 'ascend') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    return result;
  }, [data, searchText, filters, sortField, sortOrder, columns]);

  // 处理搜索
  const handleSearch = (value) => {
    setSearchText(value);
  };

  // 处理表格变化（排序、过滤等）
  const handleTableChange = (pagination, tableFilters, sorter) => {
    setFilters(tableFilters);
    
    if (sorter.field) {
      setSortField(sorter.field);
      setSortOrder(sorter.order);
    } else {
      setSortField('');
      setSortOrder('');
    }
  };

  // 处理导出
  const handleExport = () => {
    if (!filteredData.length) {
      message.warning('没有数据可以导出');
      return;
    }

    const headers = columns.map(col => col.title).join(',');
    const rows = filteredData.map(record => 
      columns.map(col => {
        const value = record[col.dataIndex];
        return value === null || value === undefined ? '' : `"${value}"`;
      }).join(',')
    );
    
    const content = [headers, ...rows].join('\n');
    const contentType = 'text/csv;charset=utf-8;';
    const filename = `${title || '数据表'}_${new Date().toISOString().slice(0, 10)}.csv`;
    
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 处理行点击
  const handleRowClick = (record) => {
    if (onRowClick) {
      onRowClick(record);
    }
  };

  // 处理选择变化
  const handleSelectionChange = (selectedKeys, selectedRows) => {
    setSelectedRowKeys(selectedKeys);
    if (onSelectionChange) {
      onSelectionChange(selectedKeys, selectedRows);
    }
  };

  // 处理重新加载
  const handleReload = () => {
    if (onReload) {
      onReload();
    }
  };

  // 获取增强的列配置
  const getEnhancedColumns = () => {
    return columns.map(col => {
      const enhancedCol = { ...col };

      // 添加默认排序
      if (col.sorter !== false && !col.sorter) {
        enhancedCol.sorter = (a, b) => {
          if (a[col.dataIndex] === null || a[col.dataIndex] === undefined) return -1;
          if (b[col.dataIndex] === null || b[col.dataIndex] === undefined) return 1;
          return a[col.dataIndex] - b[col.dataIndex];
        };
      }

      // 添加默认格式化
      if (col.format && !col.render) {
        enhancedCol.render = (value) => {
          switch (col.format) {
            case 'currency':
              return formatCurrency(value);
            case 'weight':
              return formatWeight(value);
            case 'volume':
              return formatVolume(value);
            case 'time':
              return formatTime(value);
            case 'distance':
              return formatDistance(value);
            case 'number':
              return formatNumber(value);
            default:
              return value;
          }
        };
      }

      // 添加过滤器
      if (col.filterable && !col.filters) {
        if (Array.isArray(data)) {
          const uniqueValues = [...new Set(data.map(record => record[col.dataIndex]))].filter(Boolean);
          enhancedCol.filters = uniqueValues.map(value => ({
            text: value,
            value: value
          }));
        }
      }

      // 添加过滤器处理
      if (col.filters) {
        enhancedCol.filteredValue = filters[col.dataIndex] || null;
        enhancedCol.onFilter = (value, record) => record[col.dataIndex] === value;
      }

      return enhancedCol;
    });
  };

  // 工具栏
  const renderToolbar = () => {
    if (!searchable && !filterable && !exportable && !reloadable) {
      return null;
    }

    return (
      <div className="data-table-toolbar">
        <Space>
          {searchable && (
            <Search
              placeholder="搜索..."
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              style={{ width: 250 }}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              onSearch={handleSearch}
            />
          )}
          
          {filterable && (
            <Button icon={<FilterOutlined />}>
              筛选
            </Button>
          )}
          
          {reloadable && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReload}
              loading={loading}
            >
              刷新
            </Button>
          )}
          
          {exportable && (
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
            >
              导出
            </Button>
          )}
        </Space>
        
        <div className="data-table-stats">
          共 {filteredData.length} 条记录
        </div>
      </div>
    );
  };

  // 行选择配置
  const rowSelection = onSelectionChange ? {
    selectedRowKeys,
    onChange: handleSelectionChange,
    preserveSelectedRowKeys: true,
    getCheckboxProps: (record) => ({
      disabled: record.disabled,
      name: record[rowKey]
    })
  } : undefined;

  return (
    <div className={`data-table ${className}`} style={style}>
      {title && <div className="data-table-title">{title}</div>}
      {renderToolbar()}
      
      <Table
        {...props}
        columns={getEnhancedColumns()}
        dataSource={filteredData}
        loading={loading}
        rowKey={rowKey}
        rowSelection={rowSelection}
        pagination={pagination}
        scroll={scroll}
        size={size}
        onChange={handleTableChange}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: onRowClick ? 'pointer' : 'default' }
        })}
        className="data-table-content"
      />
    </div>
  );
};

export default DataTable;