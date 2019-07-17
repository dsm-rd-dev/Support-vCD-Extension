import {
    Component,
    Inject,
    OnInit
} from "@angular/core";
import {
    VcdApiClient
} from '@vcd/sdk';
import {
    EXTENSION_ASSET_URL
} from '@vcd/sdk/common';
import {
    Query
} from "@vcd/sdk/query";
import {
    Observable
} from "rxjs";
import {
    FormBuilder,
    FormGroup,
    Validators,
    FormControl
} from '@angular/forms';
import {
    HttpClient,
    HttpHeaders
} from '@angular/common/http';
const creds = require('./creds');

@Component({
    selector: "plugin-simple",
    templateUrl: "./simple.component.html",
    styleUrls: ['./simple.component.scss'],
    host: {
        'class': 'content-container'
    }
})
export class SimpleComponent implements OnInit {
    username: Observable < string > ;
    tenant: Observable < string > ;
    create: boolean;
    confirm: boolean;
    inspect: boolean;

    error: boolean;
    errorMessage: string;

    ticketCreateData: object;
    ticketData: object;

    companyData: object;
    companyId: number;

    createForm = new FormGroup({
        summary: new FormControl('', Validators.required),
        org: new FormControl('', Validators.required),
        user: new FormControl('', Validators.required),
    });

    getTicketForm = new FormGroup({
        ticketID: new FormControl('', Validators.required)
    });

    constructor(@Inject(EXTENSION_ASSET_URL) public assetUrl: string, private http: HttpClient, private client: VcdApiClient, private formBuilder: FormBuilder) {}

    submitCreate() {
        if (this.createForm.valid) {
            this.create = false;
            console.log(this.createForm.value);

            this.http.post(creds.url + '/cw/ticket/', {
                "summary": this.createForm.get("org").value + "-" + this.createForm.get("user").value + ": " + this.createForm.get("summary").value,
                "companyName": this.createForm.get("org").value,
                "boardId": 6
            }, {
                headers: new HttpHeaders({
                    'Authorization': creds.auth,
                    'Content-Type': 'application/json'
                })
            }).subscribe(
                data => {
                    console.log("Ticket Created");
                    console.log(data);
                    this.ticketCreateData = data;
                    this.confirm = true;
                }
            );
        } else {
            console.log("INVALID FORM");
        }
    }

    openCreateForm() {
        this.tenant.subscribe(org => {
            this.createForm.get("org").setValue(org);
        });

        this.username.subscribe(user => {
            this.createForm.get("user").setValue(user)
        })
        this.create = true;
    }

    cancelCreateForm() {
        this.createForm.reset();
        this.create = false;
    }

    openTicket(i:number){
        this.inspect = true;
        this.ticketData = this.companyData[i];
        console.log(this.companyData[i]);
    }

    getTickets() {
        this.confirm = false;
        this.tenant.subscribe(
            data => {
                this.http.get(creds.url + '/cw/company/' + data + '/lookup', {
                    headers: new HttpHeaders({
                        'Authorization': creds.auth
                    })
                }).subscribe(
                    data => {
                        this.companyId = data["id"];
                        this.http.get(creds.url + '/cw/company/' + data["id"] + '/tickets', {
                            headers: new HttpHeaders({
                                'Authorization': creds.auth
                            })
                        }).subscribe(
                            data => {
                                this.companyData = data;
                            },
                            err => {
                                console.log(err);
                            }
                        );
                    },
                    err => {
                        console.log(err);
                    }
                );
            }
        );

    }

    fetchTicket(){
        let id = this.getTicketForm.get("ticketID").value;
        this.http.get(creds.url + '/cw/ticket/' + id, {
            headers: new HttpHeaders({
                'Authorization': creds.auth
            })
        }).subscribe(
            data => {
                console.log(data);
                if(data["code"] == "EPARSE"){
                    this.error = true;
                    this.errorMessage = "Invalid Ticket ID";
                }else if(data["company"]["id"] == this.companyId){
                    this.inspect = true;
                    this.ticketData = data;
                }else{
                    this.error = true;
                    this.errorMessage = "Unauthorized to view that ticket";
                }
            }
        )
    }

    ngOnInit(): void {
        this.tenant = this.client.organization;
        this.username = this.client.username;
        this.create = false;
        this.confirm = false;
        this.inspect = false;
        this.getTickets();
    }
}