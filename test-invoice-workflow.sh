#!/bin/bash

echo "🧪 Running Comprehensive Invoice Workflow Tests"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run tests and display results
run_test_suite() {
    local test_name="$1"
    local test_pattern="$2"
    
    echo -e "\n${BLUE}📋 Running $test_name...${NC}"
    echo "----------------------------------------"
    
    # Run the test
    npm test -- --testPathPattern="$test_pattern" --verbose --silent
    
    # Check exit code
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $test_name passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
}

# Initialize counters
total_tests=0
passed_tests=0
failed_tests=0

echo -e "\n${YELLOW}🚀 Starting comprehensive test suite...${NC}"

# 1. Run comprehensive workflow tests
if run_test_suite "Invoice Workflow Comprehensive Tests" "invoice-workflow-comprehensive"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# 2. Run invoice worker tests
if run_test_suite "Invoice Workers Comprehensive Tests" "invoice-workers.comprehensive"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# 3. Run existing invoice tests
if run_test_suite "Existing Invoice Tests" "invoice"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# 4. Run fetch orders worker tests
if run_test_suite "Fetch Orders Worker Tests" "fetch-orders.worker.spec"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# 5. Run all worker tests to ensure no regressions
if run_test_suite "All Worker Tests" "worker"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# 6. Run scheduler tests to ensure integration works
if run_test_suite "Scheduler Integration Tests" "scheduler"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

echo -e "\n${YELLOW}📊 Test Summary${NC}"
echo "=================="
echo -e "Total Test Suites: ${BLUE}$total_tests${NC}"
echo -e "Passed: ${GREEN}$passed_tests${NC}"
echo -e "Failed: ${RED}$failed_tests${NC}"

if [ $failed_tests -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Invoice workflow implementation is working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed. Please review the output above.${NC}"
    exit 1
fi 