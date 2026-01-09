function Partners() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">شركاء النجاح</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Partner cards will be added here */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
            <div className="w-32 h-32 bg-gray-100 rounded-full mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">شريك ١</h3>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
            <div className="w-32 h-32 bg-gray-100 rounded-full mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">شريك ٢</h3>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
            <div className="w-32 h-32 bg-gray-100 rounded-full mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">شريك ٣</h3>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Partners;
