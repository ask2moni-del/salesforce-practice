import { LightningElement, track, wire } from 'lwc';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getPicklistValuesByRecordType, getObjectInfo } from 'lightning/uiObjectInfoApi';

import getEmployees from '@salesforce/apex/EmployeeController.getEmployees';
import EMPLOYEE_OBJECT from '@salesforce/schema/Employee__c';

export default class EmployeeManager extends LightningElement {
    @track filteredEmployees = [];
    updatedRecords = new Map();

    searchKey = '';
    deptFilter = 'All';
    statusFilter = 'All';
    priorityFilter = 'All';

    // Filter Picklist Options (With 'All')
    deptOptions = [{ label: 'All Departments', value: 'All' }];
    statusOptions = [{ label: 'All Statuses', value: 'All' }];
    priorityOptions = [{ label: 'All Priorities', value: 'All' }];

    // Row Table Picklist Options (Without 'All')
    @track rowDeptOptions = [];
    @track rowStatusOptions = [];
    @track rowPriorityOptions = [];

    @wire(getObjectInfo, { objectApiName: EMPLOYEE_OBJECT })
    objectInfo;

    @wire(getPicklistValuesByRecordType, { 
        objectApiName: EMPLOYEE_OBJECT, 
        recordTypeId: '$objectInfo.data.defaultRecordTypeId' 
    })
    wiredPicklists({ data }) {
        if (data) {
            const picklists = data.picklistFieldValues;
            
            if (picklists.Department__c) {
                const rawVals = picklists.Department__c.values.map(d => ({ label: d.label, value: d.value }));
                this.rowDeptOptions = rawVals;
                this.deptOptions = [{ label: 'All Departments', value: 'All' }, ...rawVals];
            }
            if (picklists.Status__c) {
                const rawVals = picklists.Status__c.values.map(d => ({ label: d.label, value: d.value }));
                this.rowStatusOptions = rawVals;
                this.statusOptions = [{ label: 'All Statuses', value: 'All' }, ...rawVals];
            }
            if (picklists.Priority__c) {
                const rawVals = picklists.Priority__c.values.map(d => ({ label: d.label, value: d.value }));
                this.rowPriorityOptions = rawVals;
                this.priorityOptions = [{ label: 'All Priorities', value: 'All' }, ...rawVals];
            }
        }
    }

    connectedCallback() {
        this.fetchLiveEmployees();
    }

    get hasRecords() { return this.filteredEmployees.length > 0; }

    handleSearchChange(event) { this.searchKey = event.target.value; this.fetchLiveEmployees(); }
    handleDeptFilterChange(event) { this.deptFilter = event.target.value; this.fetchLiveEmployees(); }
    handleStatusFilterChange(event) { this.statusFilter = event.target.value; this.fetchLiveEmployees(); }
    handlePriorityFilterChange(event) { this.priorityFilter = event.target.value; this.fetchLiveEmployees(); }

    fetchLiveEmployees() {
        getEmployees({
            searchKey: this.searchKey,
            departmentFilter: this.deptFilter,
            statusFilter: this.statusFilter,
            priorityFilter: this.priorityFilter
        })
        .then(result => { 
            this.filteredEmployees = result; 
        })
        .catch(error => { 
            this.showToast('Workspace Error', 'Failed to retrieve directory records: ' + (error.body?.message || error.message), 'error'); 
        });
    }

    handleClearFilters() {
        this.searchKey = '';
        this.deptFilter = 'All';
        this.statusFilter = 'All';
        this.priorityFilter = 'All';
        this.fetchLiveEmployees();
    }

    handleFieldChange(event) {
        const recordId = event.target.dataset.id;
        const fieldName = event.target.dataset.field;
        
        // Dynamic detection: combobox selections route through detail, inputs route through target
        const value = event.detail.value !== undefined ? event.detail.value : event.target.value;

        let recordToUpdate = this.filteredEmployees.find(emp => emp.Id === recordId);
        if (recordToUpdate) { recordToUpdate[fieldName] = value; }

        if (!this.updatedRecords.has(recordId)) { this.updatedRecords.set(recordId, { Id: recordId }); }
        this.updatedRecords.get(recordId)[fieldName] = value;
    }

    async handleSave() {
        if (this.updatedRecords.size === 0) {
            this.showToast('Workspace Info', 'No record mutations detected.', 'info');
            return;
        }
        const recordInputs = Array.from(this.updatedRecords.values()).map(fields => ({ fields }));
        try {
            const promises = recordInputs.map(recordInput => updateRecord(recordInput));
            await Promise.all(promises);
            this.showToast('Success', 'Employee directory workspace saved successfully.', 'success');
            this.updatedRecords.clear();
            this.fetchLiveEmployees();
        } catch (error) {
            this.showToast('Save Error', error.body?.message || 'An unexpected error occurred.', 'error');
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}