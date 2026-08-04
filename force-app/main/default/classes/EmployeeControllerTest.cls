@isTest
private class EmployeeControllerTest {

    @testSetup
    static void createData(){

        List<Employee__c> empList = new List<Employee__c>();

        empList.add(new Employee__c(
            Name='John',
            Email__c='john@test.com',
            Department__c='Sales',
            Status__c='Active',
            Priority__c='High',
            Phone__c='9999999999'
        ));

        empList.add(new Employee__c(
            Name='Kevin',
            Email__c='kevin@test.com',
            Department__c='Support',
            Status__c='Pending',
            Priority__c='Medium',
            Phone__c='8888888888'
        ));

        insert empList;
    }

    @isTest
    static void testGetEmployees(){

        Test.startTest();

        List<Employee__c> listEmp =
            EmployeeController.getEmployees();

        Test.stopTest();

        System.assertEquals(2, listEmp.size());
    }

    @isTest
    static void testUpdateEmployees(){

        Employee__c emp = [
            SELECT Id, Priority__c
            FROM Employee__c
            LIMIT 1
        ];

        emp.Priority__c = 'Low';

        Test.startTest();

        EmployeeController.updateEmployees(
            new List<Employee__c>{emp}
        );

        Test.stopTest();

        Employee__c updated = [
            SELECT Priority__c
            FROM Employee__c
            WHERE Id = :emp.Id
        ];

        System.assertEquals('Low', updated.Priority__c);
    }
}