// pages/TestPage.jsx
import React from 'react';
import UserTestPanel from '../components/UserTestPanel';
import DataMigrationPanel from '../components/DataMigrationPanel';

const TestPage = () => {
  return (
    <div className="test-page">
      <div className="container">
        <h1>用户系统测试与数据迁移</h1>
        
        <div className="test-sections">
          <section className="test-section">
            <h2>🔄 数据迁移</h2>
            <DataMigrationPanel />
          </section>
          
          <section className="test-section">
            <h2>🧪 用户功能测试</h2>
            <UserTestPanel />
          </section>
        </div>
      </div>
    </div>
  );
};

export default TestPage;