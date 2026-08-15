import React from 'react';
import {
  FiDollarSign, FiShoppingBag, FiPackage, FiAlertTriangle,
  FiTrendingUp, FiHash
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { reportsAPI } from '../../utils/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
);

export default function ReportsPage() {
  const [summary, setSummary] = React.useState(null);
  const [chartData, setChartData] = React.useState([]);
  const [topProducts, setTopProducts] = React.useState([]);
  const [lowStockProducts, setLowStockProducts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [days, setDays] = React.useState(30);

  React.useEffect(() => {
    loadAll();
  }, [days]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [summaryRes, chartRes, topRes, lowRes] = await Promise.all([
        reportsAPI.getDailySummary(),
        reportsAPI.getDailyChart(days),
        reportsAPI.getTopProducts(days, 10),
        reportsAPI.getLowStock()
      ]);

      setSummary(summaryRes.data);
      setChartData(chartRes.data);
      setTopProducts(topRes.data);
      setLowStockProducts(lowRes.data);
    } catch (err) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" style={{ width: 32, height: 32 }}></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Chart config
  const salesChartData = {
    labels: chartData.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    }),
    datasets: [
      {
        label: 'Revenue (Rs.)',
        data: chartData.map(d => d.total),
        backgroundColor: 'rgba(79, 70, 229, 0.3)',
        borderColor: '#4F46E5',
        borderWidth: 2,
        borderRadius: 4,
        fill: true,
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a2e',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(148,163,184,0.12)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => `Rs. ${ctx.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(148,163,184,0.06)' },
        ticks: { color: '#64748b', maxTicksLimit: 15, font: { size: 11 } }
      },
      y: {
        grid: { color: 'rgba(148,163,184,0.06)' },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (val) => `Rs.${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`
        }
      }
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon revenue"><FiDollarSign /></div>
          <div className="stat-info">
            <h3>Rs. {(summary?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            <p>Today's Revenue</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orders"><FiShoppingBag /></div>
          <div className="stat-info">
            <h3>{summary?.totalTransactions || 0}</h3>
            <p>Transactions Today</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon items"><FiHash /></div>
          <div className="stat-info">
            <h3>{summary?.totalItemsSold || 0}</h3>
            <p>Items Sold Today</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon avg"><FiTrendingUp /></div>
          <div className="stat-info">
            <h3>Rs. {(summary?.avgSaleValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            <p>Avg. Sale Value</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon products"><FiPackage /></div>
          <div className="stat-info">
            <h3>{summary?.totalProducts || 0}</h3>
            <p>Total Products</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning"><FiAlertTriangle /></div>
          <div className="stat-info">
            <h3 className={summary?.lowStockCount > 0 ? 'text-warning' : ''}>
              {summary?.lowStockCount || 0}
            </h3>
            <p>Low Stock Items</p>
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Sales Overview</div>
            <div className="card-subtitle">Daily revenue for the last {days} days</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[7, 14, 30].map(d => (
              <button
                key={d}
                className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDays(d)}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div className="chart-container">
          <Line data={salesChartData} options={chartOptions} />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="reports-grid">
        {/* Top Products */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Top Selling Products</div>
          </div>
          {topProducts.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>
              <p>No sales data yet</p>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th className="text-right">Qty Sold</th>
                    <th className="text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((item, i) => (
                    <tr key={item._id}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td className="text-right font-mono">{item.totalQty}</td>
                      <td className="text-right font-mono">Rs. {item.totalRevenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <FiAlertTriangle style={{ marginRight: 6, color: 'var(--warning)' }} />
              Low Stock Alert
            </div>
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>
              <p className="text-success">All products are well stocked ✓</p>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-center">Stock</th>
                    <th className="text-center">Threshold</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((product) => (
                    <tr key={product._id}>
                      <td style={{ fontWeight: 500 }}>{product.name}</td>
                      <td className="text-center font-mono" style={{
                        fontWeight: 600,
                        color: product.stock === 0 ? 'var(--danger)' : 'var(--warning)'
                      }}>
                        {product.stock} {product.unit}
                      </td>
                      <td className="text-center font-mono text-muted">
                        {product.lowStockThreshold}
                      </td>
                      <td className="text-center">
                        <span className={`stock-badge ${product.stock === 0 ? 'out-of-stock' : 'low-stock'}`}>
                          {product.stock === 0 ? 'Out of Stock' : 'Low'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
