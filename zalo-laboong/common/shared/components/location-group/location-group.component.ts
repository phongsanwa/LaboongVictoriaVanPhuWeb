import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    OnInit,
    Output,
    Renderer2,
    SimpleChanges,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
import { debounceTime, distinctUntilChanged, fromEvent, map, Observable, of, switchMap } from "rxjs";
import { filter } from "rxjs/operators";
import { NgClass, NgStyle } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AppService } from "@core/services";
import { arraysAreEqual, castInt, isArray } from "@shared/utils";
import {ILocationsSearch, LocationService} from '../../services/global/location.service';


export interface IGroupLocation {
  cityId: number,
  districtId: number,
  wardId: number,
  cityName: string,
  districtName: string,
  wardName: string,
  isTwoLevel?: boolean
}

interface IDisplayList  {
    value: any;
    label: any;
    selected?: boolean,
}

interface IConfigLocation {
    placeholderInput?: string
    classInput?: string
    label?: string,
    hideWard?: boolean // Ản lựa chọn xã phường
}

/**
 * cho chọn 1 lúc thành phố, quận huyễn, phường xã
 * tìm kiếm, chọn địa chỉ theo nhóm
 * đưa vào các input mặc định là các Id
 * emit ra 1 object chứa các Id, name của select đã chọn
 * @author DungMV
 */
@Component({
    selector: 'app-location-dynamic',
    templateUrl: 'location-group.component.html',
    styleUrls: ['location-group.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        NgClass,
        FormsModule,
        NgStyle,
    ],
    exportAs: 'LocationGroupDynamic'
})
export class LocationDynamicComponent implements OnInit, AfterViewInit, OnChanges {
    CITY = 1
    DISTRICT = 2
    WARD = 3
    isOpenResult = false
    cities: IDisplayList[] = []
    districts: IDisplayList[] = []
    wards: IDisplayList[] = []
    tabActive = 1
    displayList: IDisplayList[] = [] // hiển thị theo tab chọn
    locations = {
        cityName: '',
        districtName: '',
        wardName: ''
    }
    valueDisplay = ''
    isLoading = false;
    private valuesString = '';
    private isLoadingCity = false
    private isLoadingDistrict = false
    private isLoadingWard = false
    locationsSearch: any = []
    isShowSearch = false
    placeholder = '' // placeholder hiển thị kq của lần chọn trước

    @Input() styles?: object; // Id Thành phố mặc định
    @Input() cityId?: number; // Id Thành phố mặc định
    @Input() districtId?: number; // Id Quận huyện mặc định
    @Input() wardId?: number; // Id Phường xã mặc định
    @Input() config!: IConfigLocation// config các attribute bổ sung của Input
    @Output() valueChange = new EventEmitter<IGroupLocation>(); // Emit khi địa chỉ được thay đổi

    @ViewChild('refSuggest') refSuggest: ElementRef | any;
    @ViewChild('refSelect') refSelect: ElementRef | any;
    @ViewChild('refBoxGroup') refBoxGroup: ElementRef | any;


    configUI: IConfigLocation = {
        placeholderInput: '', // placeholder Input khi không có kết quả, sử dụng khi không muốn dùng label
        classInput: '',
        label: 'common.selectLocation',
    }
    countTab = 3;
    isTwoLevel = false;
    constructor(
        private appService: AppService,
        private locationService: LocationService,
        private renderer: Renderer2
    ) {
    }

    ngOnInit() {
        this._patchConfig();
        if (this.cityId && !this.districtId && this.wardId) {
          this.isTwoLevel = true;
          this.countTab = 2;
        }
        this.setTab(this.CITY)
        this.resetSelect()
        this.loadInit()
        this.valuesString = JSON.stringify({
          cityId: this.cityId ?? 0,
          districtId: this.districtId ?? 0,
          wardId: this.wardId ?? 0,
          isTwoLevel: this.isTwoLevel
        });
    }

    private _patchConfig() {
        if (!this.config) {
            return;
        }
        const {label, classInput, placeholderInput, hideWard} = this.config;
        if (label) {
            this.configUI.label = label
        }
        if (classInput) {
            this.configUI.classInput = classInput
        }
        if (placeholderInput) {
            this.configUI.placeholderInput = placeholderInput
        }
        if (hideWard) {
            this.configUI.hideWard = hideWard
            this.countTab = 2;
        }
    }

    loadInit() {
      this.loadCity();

      if (this.cityId) {
        if (this.isTwoLevel) {
          this.loadWard(this.cityId);
          return;
        }
        this.loadDistrict(this.cityId);
        if (this.districtId && !this.config?.hideWard) {
          this.loadWard(this.districtId);
        }
      }
    }

    createValueString(cityId: any, districtId: any, wardId: any) {
        const values = [parseInt(cityId), parseInt(districtId), parseInt(wardId)]
        return JSON.stringify(values);
    }


    ngOnChanges(changes: SimpleChanges) {
        const arrChange = {
            cityId: 0,
            districtId: 0,
            wardId: 0,
        }
      if (changes?.['cityId']) {
        arrChange.cityId = changes['cityId'].currentValue;
      }
      if (changes?.['districtId']) {
        arrChange.districtId = changes['districtId'].currentValue;
      }
      if (changes?.['wardId']) {
        arrChange.wardId = changes['wardId'].currentValue;
      }
        this.valuesString = this.createValueString(arrChange.cityId, arrChange.districtId, arrChange.wardId)
        // nếu bị set value khác, load lại city, district, ward
        this.loadInit()
    }

    ngAfterViewInit() {
        fromEvent(this.refSuggest?.nativeElement, 'keyup')
            .pipe(
                map((v: any) => v.target.value),
                filter(value => value.trim() != ''),
                debounceTime(400),
                distinctUntilChanged(),
                switchMap(text => {
                    return this.getValues(text);
                })
            )
            .subscribe();
        this.hideClickOutside();
    }


    private getValues(text: string): Observable<any> {
        if (text.trim() == '') {
            this._reset();
            return of();
        }
        return this.locationService.searchLocation(text).pipe(map(res => {
            this.locationsSearch = []
            this.isShowSearch = true
            if (res.code) {
                this.locationsSearch = res.data
            }
        }));
    }

    private _reset() {
        this.locationsSearch = []
        this.isShowSearch = false
    }

    hideClickOutside() {
        this.renderer.listen('window', 'mousedown', (e: Event) => {
            if (this.isOpenResult) {
                if (!this.refSuggest.nativeElement.contains(e.target) && !this.refSelect.nativeElement.contains(e.target as Node) &&
                    !this.refBoxGroup.nativeElement.contains(e.target as Node)) {
                    this._close()
                }
            }
        })
    }


    /**
     * mở lần đầu hoặc đã chọn xong hết: chọn sẵn tab city
     * focus vào xóa value ở input đi để cho phép tìm kiếm, chỉ hiện placeholder nếu dã chọn trước đó
     */
    focusInput() {
        if (!this.isOpenResult) {
            // mở lần đầu
            this.moveTabContinue()
        }
        this.setStringDisplay()
        this.valueDisplay = '' // set lại value input = '', chỉ giữ lại placeholder
        this.isOpenResult = true
    }

    /**
     * chọn đủ cả 3 trường
     * chọn đủ cả 2 trường
     */
    isValidGroups() {
      if (this.isTwoLevel) {
        return !!(this.cityId && this.wardId);
      }
      if (this.configUI.hideWard){
        return !!(this.cityId && this.districtId);
      }
      return !!(this.cityId && this.districtId && this.wardId);
    }


    loadCity():void {
        if (this.isLoadingCity) return
        this.findValueDefault(this.CITY)
        this.isLoading = true
        this.isLoadingCity = true
        if (this.appService.getTemp('cities')) {
            this.cities = this.appService.getTemp('cities')
            this.setDisplay()
            this.findValueDefault(this.CITY)
            this.isLoading = false
            this.isLoadingCity = false
            return
        }
        //thêm locationVer để check địa chỉ 2 cấp
      const params = this.isTwoLevel ? { locationVer: 1 } : {};
        this.locationService.loadCities(params).subscribe({
            next: (res: any) => {

                if (res.code) {
                    const ct: IDisplayList[] = []
                    res.data.map((v: any) => ct.push({label: v.nativeName, value: v.id}))
                    this.cities = [...ct]
                    this.appService.setTemp('cities', ct)
                    this.setDisplay()
                    this.findValueDefault(this.CITY)
                }
            },
            complete: () => {
                this.isLoading = false
                this.isLoadingCity = false
            }
        })
    }

    loadDistrict(cityId: number):void {
        if (this.isLoadingDistrict) return
        this.findValueDefault(this.DISTRICT)
        this.isLoading = true
        this.isLoadingDistrict = true
        if (!cityId) {
            this.districts = []
            this.isLoading = false
            this.isLoadingDistrict = false
            return
        }

        if (this.appService.getTemp('districts')) {
            const district = this.appService.getTemp('districts')
            if (district?.[cityId]) {
                this.districts = district[cityId]
                this.setDisplay()
                this.findValueDefault(this.DISTRICT)
                this.isLoading = false
                this.isLoadingDistrict = false
                return
            }
        }
        this.locationService.loadDistrictsByCityId({
          cityId: cityId
        }).subscribe({
            next: (res: any) => {
                if (res.code) {
                    const dt: IDisplayList[] = []
                    res.data.map((v: any) => dt.push({label: v.nativeName, value: v.id}))
                    this.districts = [...dt]
                    const dtr = this.appService.getTemp('districts')
                    if (dtr) {
                        dtr[cityId] = dt
                        this.appService.setTemp('districts', dtr)
                    } else {
                        this.appService.setTemp('districts', {[cityId]: dtr})
                    }
                    this.setDisplay()
                    this.findValueDefault(this.DISTRICT)
                }
            },
            complete: () => {
                this.isLoading = false
                this.isLoadingDistrict = false
            }
        })
    }

    loadWard(districtId: number): void {
        if (this.isLoadingWard) return
        this.findValueDefault(this.WARD)
        this.isLoading = true
        if (!districtId) {
            this.wards = []
            this.isLoading = false
            this.isLoadingWard = false
        }
        if (this.appService.getTemp('wards')) {
            const wards = this.appService.getTemp('wards')
            if (wards?.[districtId]) {
                this.wards = wards[districtId]
                this.setDisplay()
                this.findValueDefault(this.WARD)
                this.isLoading = false
                this.isLoadingWard = false
                return
            }
        }
      const params = this.isTwoLevel ? { cityId: districtId, locationVer: 1 } : { districtId: districtId };

        this.locationService.loadWardsByDistrictId(params).subscribe({
            next: (res: any) => {
                if (res.code) {
                    const dt: IDisplayList[] = []
                    res.data.map((v: any) => dt.push({label: v.nativeName, value: v.id}))
                    this.wards = [...dt]
                    const dtr = this.appService.getTemp('wards')
                    if (dtr) {
                        dtr[districtId] = dt
                        this.appService.setTemp('wards', dtr)
                    } else {
                        this.appService.setTemp('wards', {[districtId]: dtr})
                    }
                    this.setDisplay()
                    this.findValueDefault(this.WARD)
                }
            },
            complete: () => {
                this.isLoading = false
                this.isLoadingWard = false
            }
        })
    }

    handleChangeTab(tab: number):void {
        if (!this.conditionTab(tab)) return
        this.setTab(tab)
        this.setDisplay()
    }

    /**
     * kiểm tra chuyển 'tab' được không
     * @param tab
     */
    conditionTab(tab: number) {
      if (this.isTwoLevel) {
        if (tab === this.DISTRICT) return false;
      }

      if (!this.cityId && tab !== this.CITY) return false;
      if (!this.districtId && tab === this.WARD && !this.isTwoLevel) return false;

      return true;
    }

    setTab(tab: number) {
        this.tabActive = tab
    }

    /**
     * đã có Id đưa vào từ init -> current nó để lấy valueDisplay hiển thị
     * @param tab
     */
    findValueDefault(tab: number) {
        let name = ''
        switch (tab) {
            case this.CITY: {
                if (this.cityId) {
                    const indx = this.cities.findIndex((c) => c.value == this.cityId)
                    if (indx >= 0) {
                        name = this.cities[indx].label
                    }
                }
                break
            }
            case this.DISTRICT: {
                if (this.districtId) {
                    const indx = this.districts.findIndex((c) => c.value == this.districtId)
                    if (indx >= 0) {
                        name = this.districts[indx].label
                    }
                }
                break
            }
            case this.WARD: {
                if (this.wardId) {
                    const indx = this.wards.findIndex((c) => c.value == this.wardId)
                    if (indx >= 0) {
                        name = this.wards[indx].label
                    }
                }
                break
            }
        }
        this.setLocationName(tab, name)

    }

    /**
     * set lại name từng tab đã chọn
     * set lại values, palceholder theo name mới
     * @param tab
     * @param name
     */
    setLocationName(tab: number, name: string) {
        switch (tab) {
            case this.CITY: {
                this.locations.cityName = name
                break
            }
            case this.DISTRICT: {
                this.locations.districtName = name
                break
            }
            case this.WARD: {
                this.locations.wardName = name
                break
            }
        }
        this.setStringDisplay()
    }

    /**
     * set lại values, palceholder theo name mới
     * set cho TH địa chỉ 2 cấp và 3 cấp
     */
    setStringDisplay() {
      this.placeholder = ''
      this.valueDisplay = ''

      if (this.isTwoLevel) {
        if (this.locations.cityName) {
          this.placeholder = this.locations.cityName
          this.valueDisplay = this.locations.cityName
        }

        if (this.locations.wardName) {
          this.placeholder = this.locations.wardName + ', ' + this.placeholder
          this.valueDisplay = this.locations.wardName + ', ' + this.valueDisplay
        }
        return;
      }
      if (this.locations.cityName) {
        this.placeholder = this.locations.cityName
        this.valueDisplay = this.locations.cityName

        if (this.locations.districtName) {
          this.placeholder = this.locations.districtName + ', ' + this.placeholder
          this.valueDisplay = this.locations.districtName + ', ' + this.valueDisplay

          if (this.locations.wardName) {
            this.placeholder = this.locations.wardName + ', ' + this.placeholder
            this.valueDisplay = this.locations.wardName + ', ' + this.valueDisplay
          }
        }
      }
    }

    /**
     * chọn 1 item:
     * + check là loại nào
     * + set data
     * + chuyển tab tiếp theo
     */
    choose(item: IDisplayList) {
        this.resetSelect()
        switch (this.tabActive) {
            case this.CITY: {
              this.cityId = castInt(item.value)
              this.locations.cityName = item.label

              this.districtId = undefined
              this.locations.districtName = ''

              this.wardId = undefined
              this.locations.wardName = ''

              if (this.isTwoLevel) {
                this.setTab(this.WARD)
                this.loadWard(this.cityId)
              } else {
                this.setTab(this.DISTRICT)
                this.loadDistrict(this.cityId)
              }

              break
            }
            case this.DISTRICT: {
                this.districtId = castInt(item.value)
                this.locations.districtName = item.label
                this.wardId = undefined
                this.locations.wardName = ''

                // Chỉ chuyển tab sang xã phường khi không có config ẩn xã phường
                if (!this.configUI.hideWard) {
                    this.setTab(this.tabActive + 1)
                    this.loadWard(item.value)
                }
                break
            }
            case this.WARD: {
                item.selected = true
                this.wardId = castInt(item.value)
                this.locations.wardName = item.label
                break
            }
        }
        this.setStringDisplay()

        if (this.isValidGroups()) {
            /*
            * 2 tình huống sẽ đóng dropdown
            * - Tab active là WARD
            * - Tab active là DISTRICT && configUI.hideWard
            * */
            if (this.tabActive == this.WARD || (this.tabActive == this.DISTRICT && this.configUI.hideWard)) {
                this._close()
            }
        }
    }

    private _close() {
        this.isOpenResult = false
        this.isShowSearch = false
        // set lại value input
        this.setStringDisplay()
      const dataEmit: IGroupLocation = {
        cityId: castInt(this.cityId ?? 0),
        districtId: castInt(this.districtId ?? 0),
        wardId: castInt(this.wardId ?? 0),
        cityName: this.locations.cityName,
        districtName: this.locations.districtName,
        wardName: this.locations.wardName,
        isTwoLevel: this.isTwoLevel
      }

      const arrChang = JSON.stringify({
        cityId: dataEmit.cityId,
        districtId: dataEmit.districtId,
        wardId: dataEmit.wardId,
        isTwoLevel: dataEmit.isTwoLevel
      });

      if (this.valuesString !== arrChang) {

        this.valueChange.emit(dataEmit);

        this.valuesString = arrChang;
      }
    }

    /**
     * set lại display select đang chọn theo tab header
     */
    setDisplay() {
        this.displayList = []
        switch (this.tabActive) {
            case this.CITY: {
                this.displayList = [...this.cities]
                this.resetSelect()
                if (this.cityId) {
                    const indx = this.displayList.findIndex((c) => c.value == this.cityId)
                    if (indx >= 0) {
                        this.displayList[indx].selected = true
                        this.locations.cityName = this.displayList[indx].label
                    }
                }
                break
            }
            case this.DISTRICT: {
                this.displayList = [...this.districts]
                this.resetSelect()
                if (this.districtId) {
                    const indx = this.displayList.findIndex((c) => c.value == this.districtId)
                    if (indx >= 0) {
                        this.displayList[indx].selected = true
                        this.locations.districtName = this.displayList[indx].label
                    }
                }
                break
            }
            case this.WARD: {
                this.displayList = [...this.wards]
                this.resetSelect()
                if (this.wardId) {
                    const indx = this.displayList.findIndex((c) => c.value == this.wardId)
                    if (indx >= 0) {
                        this.displayList[indx].selected = true
                        this.locations.wardName = this.displayList[indx].label
                    }
                }
                break
            }
        }
    }

    resetSelect() {
        if (!this.displayList.length) return
        this.displayList.forEach((d) => {
            if (d?.selected) {
                d.selected = false
            }
        })
    }

    resetGroup() {
        this.locations.cityName = ''
        this.locations.districtName = ''
        this.locations.wardName = ''
        this.cityId = 0
        this.districtId = 0
        this.wardId = 0
    }

    chooseItemSearch(locations: ILocationsSearch[]) {
        this.resetSelect()
        this.resetGroup()
        // lấy từ tỉnh xuống
        if (isArray(locations) && locations.length) {
            locations.sort((a, b) => b.level - a.level)
            const city = locations[0]
            if (city.matched.id) {
                this.cityId = castInt(city.matched.id)
                this.locations.cityName = city.matched.nativeName ?? ''
                if (locations[1]) {
                    const district = locations[1]
                    if (district.matched.id) {
                        this.districtId = castInt(district.matched.id)
                        this.locations.districtName = district.matched.nativeName ?? ''
                    }
                    if (locations[2]) {
                        const ward = locations[2]
                        if (ward.matched.id) {
                            this.wardId = castInt(ward.matched.id)
                            this.locations.wardName = ward.matched.nativeName ?? ''
                        }
                    }
                }
            }
            this.setStringDisplay()
            this.loadInit()
            if (this.isValidGroups()) {
                // chọn item đủ -> đóng
                this._close()
            } else {
                this.isShowSearch = false
                // chọn thiếu, tiếp tục chọn
                this.moveTabContinue()
            }
        }
    }

    moveTabContinue() {
      if (!this.cityId || this.isValidGroups()) {
        this.handleChangeTab(this.CITY)
      } else if (!this.isTwoLevel && !this.districtId) {
        this.handleChangeTab(this.DISTRICT)
      } else if (!this.wardId) {
        this.handleChangeTab(this.WARD)
      }
    }


    /**
     * xóa value:
     */
    clearGroup() {
        this.resetGroup()
        this.setStringDisplay()
        this.moveTabContinue()
        this.resetSelect()
        if(this.refSuggest){
            this.refSuggest.nativeElement.focus();
        }
    }

    isShowButtonClear() {
        return !!(this.isOpenResult && (this.cityId || this.districtId || this.wardId))
    }

    /**
     * Khi chưa chọn gì, thì mới hiện ra icon search. Có giá trị rồi, thì ẩn icon search đi, chỉ hiện icon x
     */
    isShowIconSearch() {
        return (this.isOpenResult && !this.placeholder)
    }

  onToggleTwoLevel() {
    this.resetGroup();
    this.clearCache();

    this.displayList = [];
    this.districts = [];
    this.wards = [];

    this.isLoadingDistrict = false;
    this.isLoadingWard = false;

    if (this.isTwoLevel) {
      this.countTab = 2;
    } else {
      this.countTab = 3;
    }

    this.setTab(this.CITY);

    this.setDisplay();

    this.loadCity();
  }

  clearCache() {
    this.appService.setTemp('districts', {});
    this.appService.setTemp('wards', {});
  }
}

