import React from 'react';

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem('adminUser'));

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Welcome Back, {user?.name}</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-gold">
          <h3 className="text-gray-500 text-sm font-semibold">Today's Orders</h3>
          <p className="text-3xl font-bold mt-2">12</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-silver">
          <h3 className="text-gray-500 text-sm font-semibold">Total Products</h3>
          <p className="text-3xl font-bold mt-2">145</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-gray-800">
          <h3 className="text-gray-500 text-sm font-semibold">Daily Revenue</h3>
          <p className="text-3xl font-bold mt-2">₹ 2,45,000</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;