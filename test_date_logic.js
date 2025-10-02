// Test the date logic for June 2025
const year = 2025;
const month = 6; // June (1-based)

console.log('Testing date logic for June 2025:');
console.log('month =', month);

// Test getting days in month
const daysInMonth = new Date(year, month, 0).getDate();
console.log('daysInMonth =', daysInMonth);

// Test creating dates for each day
for (let day = 1; day <= daysInMonth; day++) {
  const date = new Date(year, month - 1, day);
  const dateString = date.toISOString().split('T')[0];
  console.log(`Day ${day}: ${dateString} (${date.toLocaleDateString('en-US', { weekday: 'short' })})`);
}
