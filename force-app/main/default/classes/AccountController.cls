public with sharing class AccountController {
    
    @AuraEnabled
    public static List<Account> getAccounts(String searchKey, String industryFilter, String typeFilter, String ratingFilter, Integer pageNumber, Integer pageSize) {
        try {
            // Guard conditions
            if (pageNumber == null || pageNumber < 1) { pageNumber = 1; }
            if (pageSize == null || pageSize < 1) { pageSize = 5; }
            Integer offsetValue = (pageNumber - 1) * pageSize;

            String query = 'SELECT Id, Name, Email__c, Phone, Type, Industry, Rating, CustomerPriority__c, SLA__c, AnnualRevenue FROM Account ';
            List<String> conditions = new List<String>();
            
            if (String.isNotBlank(searchKey)) {
                String key = '%' + String.escapeSingleQuotes(searchKey) + '%';
                conditions.add('Name LIKE :key');
            }
            if (String.isNotBlank(industryFilter) && industryFilter != 'All') {
                conditions.add('Industry = :industryFilter');
            }
            if (String.isNotBlank(typeFilter) && typeFilter != 'All') {
                conditions.add('Type = :typeFilter');
            }
            if (String.isNotBlank(ratingFilter) && ratingFilter != 'All') {
                conditions.add('Rating = :ratingFilter');
            }
            
            if (!conditions.isEmpty()) {
                query += ' WHERE ' + String.join(conditions, ' AND ');
            }
            
            query += ' WITH USER_MODE ORDER BY Name ASC LIMIT :pageSize OFFSET :offsetValue';
            
            return Database.query(query);
        } catch (Exception e) {
            throw new AuraHandledException('Unable to process records: ' + e.getMessage());
        }
    }
}