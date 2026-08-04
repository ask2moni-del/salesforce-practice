public with sharing class EmployeeController {
    @AuraEnabled(cacheable=false)
    public static List<Employee__c> getEmployees(String searchKey, String departmentFilter, String statusFilter, String priorityFilter) {
        
        // Base select query
        String query = 'SELECT Id, Name, Email__c, Department__c, Status__c, Priority__c, Phone__c FROM Employee__c WHERE Id != null';
        
        // 1. Search strictly by Name (when text is entered)
        if (String.isNotBlank(searchKey)) {
            String cleanName = '%' + String.escapeSingleQuotes(searchKey) + '%';
            query += ' AND Name LIKE :cleanName';
        }
        
        // 2. Column Header Dropdown Filters
        if (String.isNotBlank(departmentFilter) && departmentFilter != 'All') {
            query += ' AND Department__c = :departmentFilter';
        }
        if (String.isNotBlank(statusFilter) && statusFilter != 'All') {
            query += ' AND Status__c = :statusFilter';
        }
        if (String.isNotBlank(priorityFilter) && priorityFilter != 'All') {
            query += ' AND Priority__c = :priorityFilter';
        }
        
        query += ' WITH USER_MODE ORDER BY Name ASC LIMIT 100';
        return Database.query(query);
    }
}